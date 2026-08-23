import { supabase } from "../supabase";
import { errorMessage } from "../errors";
import {
  compressDocumentImage,
  compressPhoto,
  MAX_UPLOAD_BYTES,
} from "../images";

export interface PlayerInput {
  full_name: string;
  dob: string;
  nationality: string;
  position: string;
  jersey_number?: string;
  photo?: File | null; // Player picture — PUBLIC (meant to be shown on squad pages)
  proof_of_age: File; // PRIVATE (minor's document)
}

export interface RegistrationInput {
  tournament_slug: string;
  /**
   * Pre-allocated registration id. Pass one when the caller needs the id BEFORE
   * submitting — the roster PDF prints its reference number, and that PDF is
   * built before the upload starts. Omit it and one is generated here.
   */
  id?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  academy_name: string;
  coach_full_name: string;
  coach_dob: string;
  coach_nationality: string;
  team_logo?: File | null; // PUBLIC (meant to be shown)
  coach_photo?: File | null; // PUBLIC (coach passport headshot — shown on review + summary)
  players: PlayerInput[];
  /**
   * Pre-rendered roster summary PDF (generated client-side from the in-memory
   * File objects). Stored in a PUBLIC bucket so the registrant can download it
   * from the confirmation page and the admin page can link to the same URL.
   * Optional.
   */
  receipt_pdf_blob?: Blob | null;
  /** Optional progress reporter so the UI can narrate a slow submit. */
  onProgress?: (message: string) => void;
}

export interface SubmitRegistrationResult {
  id: string;
  receipt_pdf_url: string;
}

/* -------------------------------------------------------------------------- */
/*  File validation & upload helpers                                          */
/* -------------------------------------------------------------------------- */

/*
 * The hard per-file ceiling (MAX_UPLOAD_BYTES, currently 120KB) lives in
 * lib/images.ts next to the compression targets that have to satisfy it — one
 * number, not two that drift apart. See that file for the storage-budget maths.
 */

const IMAGE_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

const DOC_MIME = [...IMAGE_MIME, "application/pdf"];
const DOC_EXT = [...IMAGE_EXT, "pdf"];

// Strip anything that could be used for path traversal / injection in the
// storage key, and cap the length. Supabase also sanitizes, but we do it too.
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
  // keep the tail so the extension survives, cap total length
  return cleaned.slice(-80) || "file";
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * Validate a user-supplied file before uploading. This is the single choke
 * point for every storage upload in the app — enforcing type + size here
 * covers all registration paths.
 */
function validateFile(
  file: File,
  kind: "image" | "doc",
  label: string,
): void {
  if (!file) throw new Error(`${label} is required.`);
  if (file.size === 0) throw new Error(`${label} appears to be empty.`);

  if (file.size > MAX_UPLOAD_BYTES) {
    const isPdf = file.type === "application/pdf";
    throw new Error(
      `${label} is too large (${Math.round(file.size / 1024)}KB, max ${Math.round(
        MAX_UPLOAD_BYTES / 1024,
      )}KB).${
        isPdf
          ? " PDFs can't be compressed automatically — please take a photo of the document instead."
          : " Please choose a smaller image."
      }`,
    );
  }

  const allowedMime = kind === "image" ? IMAGE_MIME : DOC_MIME;
  const allowedExt = kind === "image" ? IMAGE_EXT : DOC_EXT;
  const ext = extensionOf(file.name);

  // Prefer MIME when the browser provides it; otherwise fall back to extension.
  const typeOk = file.type
    ? allowedMime.includes(file.type.toLowerCase())
    : allowedExt.includes(ext);
  const extOk = ext ? allowedExt.includes(ext) : true;

  if (!typeOk || !extOk) {
    throw new Error(
      `${label} must be ${kind === "image" ? "an image (JPG, PNG, WEBP)" : "a PDF or image"}.`,
    );
  }
}

/**
 * Last-resort shrink. Photos are normally already compressed at the moment the
 * user picks them (see PhotoUpload / the players form), so this is a
 * no-op for them. It only does work for a file that slipped through oversized,
 * which keeps us from re-encoding — and degrading — an already-small image.
 */
async function ensureUnderCap(
  file: File,
  kind: "photo" | "document",
): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  return kind === "photo"
    ? compressPhoto(file)
    : compressDocumentImage(file);
}

/**
 * Storage failures that will never succeed on a retry, so retrying just wastes
 * the operator's time. Everything NOT matched here is treated as transient.
 *
 * That default is deliberate: the cost of retrying a permanent error is a couple
 * of wasted seconds, whereas the cost of *not* retrying a transient one is
 * losing a half-entered team. The asymmetry says retry unless we're sure.
 */
function isPermanentUploadError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("mime type") || // bucket MIME allow-list
    m.includes("maximum allowed size") || // bucket per-object cap
    m.includes("already exists") || // upsert:false collision
    m.includes("duplicate") ||
    m.includes("row-level security") || // policy refusal
    m.includes("violates")
  );
}

/** Attempts per network call, and the base for exponential backoff between them. */
const NETWORK_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

function retryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, RETRY_BASE_MS * 2 ** (attempt - 1)),
  );
}

/**
 * True for PostgREST's "0 rows" error, which `.single()` raises when a filter
 * matches nothing. That's a definitive answer from a working database, not a
 * failure to reach one — so it must not be retried or reported as a fault.
 */
function isNoRows(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "PGRST116"
  );
}

/**
 * Upload a validated file/blob and return its storage PATH (not a URL).
 * Use publicUrl (public buckets) or getSignedUrl (private buckets) to read.
 *
 * Retries transient failures. WHY: a full team is 38 uploads (18 photos + 18
 * proof-of-age documents + logo + coach), all typed in at the venue over venue
 * wifi. A single dropped connection used to abort the whole submission — and
 * because the registration row is inserted BEFORE the players loop, that left a
 * team with only some of its players. Observed for real on 2026-08-23: one
 * upload failed with a bare `fetch failed` while the identical one a second
 * later succeeded.
 */
async function uploadToBucket(
  bucket: string,
  path: string,
  body: File | Blob,
  contentType?: string,
): Promise<string> {
  const resolvedType =
    contentType ?? (body instanceof File ? body.type : undefined) ?? undefined;

  let lastMessage = `Could not upload to ${bucket}.`;

  for (let attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType: resolvedType,
      // The first attempt refuses to overwrite. A retry may be re-sending a
      // file whose previous attempt actually landed before the connection
      // dropped, so it has to be allowed to replace it. Safe because every path
      // is namespaced under a freshly generated registration UUID.
      upsert: attempt > 1,
    });

    if (!error) return path;

    lastMessage = errorMessage(error);
    if (isPermanentUploadError(lastMessage) || attempt === NETWORK_ATTEMPTS) break;

    await retryDelay(attempt);
  }

  throw new Error(lastMessage);
}

function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Generate a short-lived signed URL for a PRIVATE bucket object.
 *
 * Only proof-of-age documents live in a private bucket. Nothing else sensitive
 * is uploaded any more — consent forms are collected on paper and no payment
 * document exists. Never make this bucket public: it holds minors' identity
 * documents.
 */
export async function getSignedUrl(
  bucket: "proof-of-age",
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Cryptographically-random registration id, generated on the client.
 *
 * We deliberately create the primary key here instead of letting Postgres do
 * it, because the anon role has no SELECT policy on `registrations` (there is
 * no auth/user_id to scope a read to). That means `.insert().select()` would
 * come back empty and throw. By choosing the id ourselves we can INSERT
 * without reading anything back, and still thread the id through to the player
 * rows and the confirmation page.
 */
export function newRegistrationId(): string {
  return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/*  Submit the entire registration in one shot                                */
/* -------------------------------------------------------------------------- */

/**
 * Persist a registration, its players, their proof-of-age documents, and the
 * roster PDF — all at once, only ever INSERTing (never UPDATE/SELECT), so it
 * works under the locked-down anon RLS policy.
 *
 * This is the whole of what the site does with a registration: save it. There is
 * no fee, no notification and no approval step — the row lands as
 * `pending_payment` (a historical column value that now just means "registered")
 * and everything after that happens off the site.
 *
 * Buckets touched:
 *   - team-logos            PUBLIC   (team logo)
 *   - player-photos         PUBLIC   (player pictures + coach headshot)
 *   - proof-of-age          PRIVATE  (path only; signed on demand by admin)
 *   - registration-receipts PUBLIC   (downloadable roster PDF)
 */
export async function submitRegistration(
  data: RegistrationInput,
): Promise<SubmitRegistrationResult> {
  const report = data.onProgress ?? (() => {});

  // Resolve tournament slug → id. Retried: this is the FIRST network call of the
  // whole submission, so a transient failure here used to abort a fully-typed
  // registration with the message "Invalid tournament selected" — which sent you
  // hunting for a bad slug when the connection had simply dropped.
  let tournament: { id: string } | null = null;
  let tourneyError: unknown = null;

  for (let attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
    const result = await supabase
      .from("tournaments")
      .select("id")
      .eq("slug", data.tournament_slug)
      .single();

    tournament = result.data;
    tourneyError = result.error;

    // PGRST116 = "0 rows" — a real answer, not a failure. Don't retry it.
    if (!tourneyError || isNoRows(tourneyError)) break;
    if (attempt < NETWORK_ATTEMPTS) await retryDelay(attempt);
  }

  if (tourneyError && !isNoRows(tourneyError)) {
    throw new Error(
      `Could not reach the database to confirm the tournament: ${errorMessage(tourneyError)}. Nothing was saved — check the connection and submit again.`,
    );
  }
  if (!tournament) {
    throw new Error(
      `Invalid tournament selected: no tournament has the slug "${data.tournament_slug}".`,
    );
  }

  // Only submit players that were actually filled in.
  const players = data.players.filter((p) => p.full_name.trim().length > 0);
  if (players.length === 0)
    throw new Error("Add at least one player before submitting.");

  // Shrink anything still oversized, THEN validate. Order matters: validating
  // first would reject a large photo we were about to fix.
  report("Preparing your photos...");
  const teamLogo = data.team_logo
    ? await ensureUnderCap(data.team_logo, "photo")
    : null;
  const coachPhoto = data.coach_photo
    ? await ensureUnderCap(data.coach_photo, "photo")
    : null;

  const prepared = await Promise.all(
    players.map(async (p) => ({
      ...p,
      photo: p.photo ? await ensureUnderCap(p.photo, "photo") : null,
      proof_of_age: await ensureUnderCap(p.proof_of_age, "document"),
    })),
  );

  // Validate everything up front so we don't create a half-written record.
  if (teamLogo) validateFile(teamLogo, "image", "Team logo");
  if (coachPhoto) validateFile(coachPhoto, "image", "Coach photo");
  prepared.forEach((p, i) => {
    const who = p.full_name.trim() || `Player ${i + 1}`;
    if (p.photo) validateFile(p.photo, "image", `${who}'s photo`);
    validateFile(p.proof_of_age, "doc", `${who}'s proof of age`);
  });

  const regId = data.id ?? newRegistrationId();

  // Team logo — PUBLIC bucket (meant to be shown).
  report("Uploading your details...");
  let teamLogoUrl = "";
  if (teamLogo) {
    const logoPath = `${regId}/logo_${sanitizeFileName(teamLogo.name)}`;
    await uploadToBucket("team-logos", logoPath, teamLogo);
    teamLogoUrl = publicUrl("team-logos", logoPath);
  }

  // Coach passport headshot — PUBLIC. Reuses the player-photos bucket (same kind
  // of person photo, same visibility) so no extra bucket has to be provisioned.
  let coachPhotoUrl = "";
  if (coachPhoto) {
    const coachPath = `${regId}/coach_${sanitizeFileName(coachPhoto.name)}`;
    await uploadToBucket("player-photos", coachPath, coachPhoto);
    coachPhotoUrl = publicUrl("player-photos", coachPath);
  }

  // Roster PDF — PUBLIC bucket. The registrant downloads it from the
  // confirmation page, and the admin page links to the same URL.
  let receiptPdfUrl = "";
  if (data.receipt_pdf_blob) {
    const pdfPath = `${regId}/summary.pdf`;
    await uploadToBucket(
      "registration-receipts",
      pdfPath,
      data.receipt_pdf_blob,
      "application/pdf",
    );
    receiptPdfUrl = publicUrl("registration-receipts", pdfPath);
  }

  // Insert the registration with our client-chosen id — no .select() (anon has
  // no read policy) and no later UPDATE (all client UPDATEs are RLS-blocked).
  // 'pending_payment' is the only status the anon RLS policy lets us set for a
  // new row. Read it as "registered": an admin can only move it to 'rejected'
  // (cancelled) from the admin page.
  const { error: regError } = await supabase.from("registrations").insert([
    {
      id: regId,
      tournament_id: tournament.id,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      academy_name: data.academy_name,
      team_logo_url: teamLogoUrl,
      coach_full_name: data.coach_full_name,
      coach_dob: data.coach_dob,
      coach_nationality: data.coach_nationality,
      coach_photo_url: coachPhotoUrl,
      receipt_pdf_url: receiptPdfUrl,
      payment_status: "pending_payment",
    },
  ]);

  if (regError) throw regError;

  // Upload each player's files and insert their row, referencing regId.
  let done = 0;
  for (const player of prepared) {
    report(`Uploading players (${++done}/${prepared.length})...`);

    // Player photo — PUBLIC bucket (shown on squad pages). Optional.
    let photoUrl = "";
    if (player.photo) {
      const photoPath = `${regId}/photo_${sanitizeFileName(player.photo.name)}`;
      await uploadToBucket("player-photos", photoPath, player.photo);
      photoUrl = publicUrl("player-photos", photoPath);
    }

    // Proof of age — PRIVATE bucket. Store the PATH; read via signed URL.
    const agePath = `${regId}/age_${sanitizeFileName(player.proof_of_age.name)}`;
    await uploadToBucket("proof-of-age", agePath, player.proof_of_age);

    const { error: playerErr } = await supabase.from("players").insert([
      {
        registration_id: regId,
        full_name: player.full_name,
        dob: player.dob,
        nationality: player.nationality,
        position: player.position,
        jersey_number: player.jersey_number ?? null,
        photo_url: photoUrl, // public URL (safe to expose)
        proof_of_age_path: agePath, // private path (sign on demand)
      },
    ]);

    if (playerErr) throw playerErr;
  }

  return { id: regId, receipt_pdf_url: receiptPdfUrl };
}
