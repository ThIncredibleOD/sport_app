import { supabase } from "../supabase";

export interface PlayerInput {
  full_name: string;
  dob: string;
  nationality: string;
  position: string;
  jersey_number?: string;
  photo?: File | null; // Player picture — PUBLIC (meant to be shown on squad pages)
  consent_form: File; // PRIVATE (minor's document)
  proof_of_age: File; // PRIVATE (minor's document)
}

export interface RegistrationInput {
  tournament_slug: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  academy_name: string;
  coach_full_name: string;
  coach_dob: string;
  coach_nationality: string;
  team_logo?: File | null; // PUBLIC (meant to be shown)
  coach_photo?: File | null; // PUBLIC (coach passport headshot — shown on review + receipt)
  players: PlayerInput[];
  /**
   * Payment receipt uploaded by the registrant — PRIVATE. When present, the
   * whole registration is submitted in one shot with status
   * "pending_verification" (the single-submit-at-receipt flow). When absent,
   * nothing about payment is recorded and the status stays "pending_upload".
   */
  receipt_file?: File | null;
  /**
   * Pre-rendered roster receipt PDF (generated client-side from the in-memory
   * File objects). Stored in a PUBLIC bucket so the registrant can download it
   * from the confirmation page. Optional.
   */
  receipt_pdf_blob?: Blob | null;
}

export interface SubmitRegistrationResult {
  id: string;
  receipt_pdf_url: string;
}

/* -------------------------------------------------------------------------- */
/*  File validation & upload helpers                                          */
/* -------------------------------------------------------------------------- */

const MB = 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * MB;
const MAX_DOC_BYTES = 10 * MB;

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
 * covers all registration/receipt paths.
 */
function validateFile(
  file: File,
  kind: "image" | "doc",
  label: string,
): void {
  if (!file) throw new Error(`${label} is required.`);
  if (file.size === 0) throw new Error(`${label} appears to be empty.`);

  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (file.size > max) {
    throw new Error(
      `${label} is too large (max ${Math.round(max / MB)}MB).`,
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
 * Upload a validated file/blob and return its storage PATH (not a URL).
 * Use publicUrl (public buckets) or getSignedUrl (private buckets) to read.
 */
async function uploadToBucket(
  bucket: string,
  path: string,
  body: File | Blob,
  contentType?: string,
): Promise<string> {
  const resolvedType =
    contentType ?? (body instanceof File ? body.type : undefined) ?? undefined;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: resolvedType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Generate a short-lived signed URL for a PRIVATE bucket object.
 * Use this on the admin/approval side to view consent forms, proof-of-age
 * documents, and payment receipts. Never make these buckets public.
 */
export async function getSignedUrl(
  bucket: "consent-forms" | "proof-of-age" | "receipts",
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
function newRegistrationId(): string {
  return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/*  Submit the entire registration in one shot (single-submit-at-receipt)     */
/* -------------------------------------------------------------------------- */

/**
 * Persist a registration, its players, their documents, the payment receipt,
 * and the roster PDF — all at once, only ever INSERTing (never UPDATE/SELECT),
 * so it works under the locked-down anon RLS policy.
 *
 * Buckets touched:
 *   - team-logos            PUBLIC   (team logo)
 *   - player-photos         PUBLIC   (player pictures)
 *   - consent-forms         PRIVATE  (path only; signed on demand by admin)
 *   - proof-of-age          PRIVATE  (path only; signed on demand by admin)
 *   - receipts              PRIVATE  (payment receipt path; signed for admin)
 *   - registration-receipts PUBLIC   (downloadable roster PDF)
 */
export async function submitRegistration(
  data: RegistrationInput,
): Promise<SubmitRegistrationResult> {
  // Resolve tournament slug → id.
  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", data.tournament_slug)
    .single();

  if (tourneyError || !tournament)
    throw new Error("Invalid tournament selected.");

  // Only submit players that were actually filled in.
  const players = data.players.filter((p) => p.full_name.trim().length > 0);
  if (players.length === 0)
    throw new Error("Add at least one player before submitting.");

  // Validate everything up front so we don't create a half-written record.
  if (data.team_logo) validateFile(data.team_logo, "image", "Team logo");
  if (data.coach_photo) validateFile(data.coach_photo, "image", "Coach photo");
  if (data.receipt_file)
    validateFile(data.receipt_file, "doc", "Payment receipt");
  players.forEach((p, i) => {
    if (p.photo) validateFile(p.photo, "image", `Player ${i + 1} photo`);
    validateFile(p.consent_form, "doc", `Player ${i + 1} consent form`);
    validateFile(p.proof_of_age, "doc", `Player ${i + 1} proof of age`);
  });

  const regId = newRegistrationId();

  // Team logo — PUBLIC bucket (meant to be shown).
  let teamLogoUrl = "";
  if (data.team_logo) {
    const logoPath = `${regId}/logo_${sanitizeFileName(data.team_logo.name)}`;
    await uploadToBucket("team-logos", logoPath, data.team_logo);
    teamLogoUrl = publicUrl("team-logos", logoPath);
  }

  // Coach passport headshot — PUBLIC. Reuses the player-photos bucket (same kind
  // of person photo, same visibility) so no extra bucket has to be provisioned.
  let coachPhotoUrl = "";
  if (data.coach_photo) {
    const coachPath = `${regId}/coach_${sanitizeFileName(data.coach_photo.name)}`;
    await uploadToBucket("player-photos", coachPath, data.coach_photo);
    coachPhotoUrl = publicUrl("player-photos", coachPath);
  }

  // Payment receipt — PRIVATE bucket. Store the PATH; admin reads via signed URL.
  let receiptPath: string | null = null;
  if (data.receipt_file) {
    receiptPath = `${regId}/receipt_${sanitizeFileName(data.receipt_file.name)}`;
    await uploadToBucket("receipts", receiptPath, data.receipt_file);
  }

  // Roster PDF — PUBLIC bucket (registrant downloads it from confirmation page).
  let receiptPdfUrl = "";
  if (data.receipt_pdf_blob) {
    const pdfPath = `${regId}/receipt.pdf`;
    await uploadToBucket(
      "registration-receipts",
      pdfPath,
      data.receipt_pdf_blob,
      "application/pdf",
    );
    receiptPdfUrl = publicUrl("registration-receipts", pdfPath);
  }

  // A receipt means the registrant has paid and is awaiting manual verification.
  // No receipt means they haven't reached the payment step yet.
  const paymentStatus = data.receipt_file
    ? "pending_verification"
    : "pending_upload";

  // Insert the registration with our client-chosen id — no .select() (anon has
  // no read policy) and no later UPDATE (all client UPDATEs are RLS-blocked).
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
      payment_receipt_path: receiptPath,
      receipt_pdf_url: receiptPdfUrl,
      payment_status: paymentStatus,
    },
  ]);

  if (regError) throw regError;

  // Upload each player's files and insert their row, referencing regId.
  for (const player of players) {
    // Player photo — PUBLIC bucket (shown on squad pages). Optional.
    let photoUrl = "";
    if (player.photo) {
      const photoPath = `${regId}/photo_${sanitizeFileName(player.photo.name)}`;
      await uploadToBucket("player-photos", photoPath, player.photo);
      photoUrl = publicUrl("player-photos", photoPath);
    }

    // Consent form — PRIVATE bucket. Store the PATH; read via signed URL.
    const consentPath = `${regId}/consent_${sanitizeFileName(player.consent_form.name)}`;
    await uploadToBucket("consent-forms", consentPath, player.consent_form);

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
        consent_form_path: consentPath, // private path (sign on demand)
        proof_of_age_path: agePath, // private path (sign on demand)
      },
    ]);

    if (playerErr) throw playerErr;
  }

  return { id: regId, receipt_pdf_url: receiptPdfUrl };
}
