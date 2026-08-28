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

/**
 * A team official other than the head coach — team manager, assistant coach or
 * medic. All three are captured identically, so one shape covers them.
 *
 * A slot with a blank `full_name` means the team simply doesn't have that
 * person: it is stored as NULLs and uploads nothing.
 */
export interface OfficialInput {
  full_name: string;
  dob: string;
  nationality: string;
  photo?: File | null; // PUBLIC (passport headshot — shown on review + summary)
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
  /**
   * Officials besides the head coach. Every one of them is optional — a team may
   * turn up without an assistant coach or a second medic — so an absent or
   * blank-named entry is stored as NULLs and never blocks a submission.
   */
  team_manager?: OfficialInput | null;
  assistant_coach?: OfficialInput | null;
  /** Up to two medics, in order. Missing entries count as absent. */
  medics?: (OfficialInput | null | undefined)[];
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
  /**
   * Optional bookkeeping so a retry picks up where the last attempt stopped.
   * Pass the SAME object (see `newSubmitProgress`) on every retry of the same
   * registration and reuse the same `id`. See `SubmitProgress` for why.
   */
  progress?: SubmitProgress;
}

/**
 * What a previous attempt at this registration already got done.
 *
 * WHY THIS EXISTS: a full team is 38 uploads plus 19 inserts, typed in at the
 * venue over venue wifi, and the registration row is written BEFORE the players
 * loop. Without this, a connection drop at player 7 of 11 left 6 players saved,
 * and pressing Submit again allocated a NEW id — so the database ended up with
 * one orphaned 6-player team and one complete one, with no way to tell them
 * apart later. The anon role has no UPDATE or SELECT rights, so the client
 * cannot repair or even inspect that state afterwards.
 *
 * Carrying this across retries makes a second Submit resume instead of
 * duplicate: finished uploads are skipped, the registration row is not
 * re-inserted, and only the players that never landed are sent.
 */
export interface SubmitProgress {
  /** Storage keys ("bucket/path") confirmed uploaded. */
  uploaded: Set<string>;
  /** True once the `registrations` row is committed. */
  registrationSaved: boolean;
  /** Indexes into the filled-player list whose row is committed. */
  playersSaved: Set<number>;
}

export function newSubmitProgress(): SubmitProgress {
  return {
    uploaded: new Set<string>(),
    registrationSaved: false,
    playersSaved: new Set<number>(),
  };
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
 * A date value for Postgres, or NULL when there isn't one.
 *
 * Postgres `date` columns reject an empty string outright — `invalid input
 * syntax for type date: ""` — and an official nobody entered genuinely has no
 * date, so a blank has to be written as NULL, not "". Every optional date this
 * module writes goes through here; none is put in a row literal directly. Note
 * `coach_dob` is NOT NULL, so it is guarded up front instead (see
 * submitRegistration).
 */
function dateOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
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
 * Refuse to start if two different files would be written to the same storage
 * key, so one can never silently overwrite the other.
 *
 * WHY THIS EXISTS: player files were stored at `<regId>/photo_<filename>` —
 * nothing in the path identified the player. Phone galleries name almost every
 * picture `image.jpg`, so a whole squad's photos targeted ONE object: each
 * upload replaced the last and every player row was left pointing at the same
 * file. Three teams were registered that way before it was noticed, because the
 * roster PDF is built from the in-memory files and therefore looked correct
 * while the database did not. The overwritten originals were gone for good.
 *
 * Every path now carries a per-item discriminator — the slot number for players,
 * the role for officials — so this cannot fire as the code stands. It is here so
 * that if an edit ever drops one, the submission stops with a clear message
 * BEFORE the first byte is uploaded, instead of quietly storing one face for a
 * whole team. Called once per submit, over every path including those belonging
 * to already-saved players, so it behaves identically on a resumed attempt.
 */
function assertUniquePaths(
  entries: { bucket: string; path: string; label: string }[],
): void {
  const owners = new Map<string, string>();
  for (const entry of entries) {
    const key = `${entry.bucket}/${entry.path}`;
    const owner = owners.get(key);
    if (owner) {
      throw new Error(
        `Internal error: ${owner} and ${entry.label} would both be stored as "${key}", so one would overwrite the other. Nothing has been saved. This is a bug in the app, not something you did — retrying will not help.`,
      );
    }
    owners.set(key, entry.label);
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
 * Failures that will never succeed on a retry, so retrying just wastes the
 * operator's time. Everything NOT matched here is treated as transient.
 *
 * That default is deliberate: the cost of retrying a permanent error is a couple
 * of wasted seconds, whereas the cost of *not* retrying a transient one is
 * losing a half-entered team. The asymmetry says retry unless we're sure.
 *
 * Covers both storage and database failures — a bucket's MIME refusal and a
 * "violates row-level security policy" are equally final.
 */
function isPermanentFailure(message: string): boolean {
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
 * Postgres unique-violation (23505). On `registrations` this can only mean our
 * own earlier attempt already committed the row — the id is a UUID this client
 * generated and nobody else has it — so it counts as success, not failure.
 */
function isDuplicateKey(error: unknown): boolean {
  if (typeof error === "undefined" || error === null) return false;
  if (typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "23505" || /duplicate key/i.test(e.message ?? "");
}

/**
 * INSERT one row, retrying transient failures.
 *
 * No `.select()` anywhere: the anon role has no read policy, so asking for the
 * row back would fail even though the write succeeded.
 */
async function insertWithRetry(
  table: "registrations" | "players",
  row: Record<string, unknown>,
  { duplicateIsSuccess = false }: { duplicateIsSuccess?: boolean } = {},
): Promise<void> {
  let lastError: unknown = new Error(`Could not save to ${table}.`);

  for (let attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
    const { error } = await supabase.from(table).insert([row]);
    if (!error) return;
    if (duplicateIsSuccess && isDuplicateKey(error)) return;

    lastError = error;
    if (isPermanentFailure(errorMessage(error)) || attempt === NETWORK_ATTEMPTS)
      break;

    await retryDelay(attempt);
  }

  throw lastError;
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
  progress?: SubmitProgress,
): Promise<string> {
  // Already sent on an earlier attempt at this same registration — re-sending it
  // would just spend venue bandwidth on a file that is already in the bucket.
  const key = `${bucket}/${path}`;
  if (progress?.uploaded.has(key)) return path;

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

    if (!error) {
      progress?.uploaded.add(key);
      return path;
    }

    lastMessage = errorMessage(error);
    if (isPermanentFailure(lastMessage) || attempt === NETWORK_ATTEMPTS) break;

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
 *   - player-photos         PUBLIC   (player pictures + every official's headshot)
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

  // coach_full_name and coach_dob are NOT NULL, and coach_dob is a `date` — so a
  // blank one fails with a raw Postgres type error that tells the operator
  // nothing. Say what is actually missing instead. The review and submit screens
  // already gate on this; this is the backstop for a deep-linked submit.
  if (!data.coach_full_name.trim())
    throw new Error("Add the head coach's full name before submitting.");
  if (!dateOrNull(data.coach_dob))
    throw new Error("Add the head coach's date of birth before submitting.");

  // Shrink anything still oversized, THEN validate. Order matters: validating
  // first would reject a large photo we were about to fix.
  report("Preparing your photos...");
  const teamLogo = data.team_logo
    ? await ensureUnderCap(data.team_logo, "photo")
    : null;
  const coachPhoto = data.coach_photo
    ? await ensureUnderCap(data.coach_photo, "photo")
    : null;

  // Officials besides the head coach. One list drives compression, validation,
  // upload AND the row columns, so a role can't end up handled four subtly
  // different ways. `column` is the registrations column prefix; `prefix` names
  // the file inside the registration's storage folder.
  //
  // A slot whose name is blank is absent, not incomplete: nothing is compressed,
  // validated, uploaded or stored for it, and every one of its columns is NULL.
  const officials = await Promise.all(
    [
      { column: "manager", prefix: "manager", label: "Team manager", input: data.team_manager },
      { column: "assistant_coach", prefix: "assistant", label: "Assistant coach", input: data.assistant_coach },
      { column: "medic1", prefix: "medic1", label: "Medic 1", input: data.medics?.[0] },
      { column: "medic2", prefix: "medic2", label: "Medic 2", input: data.medics?.[1] },
    ].map(async (slot) => {
      const fullName = (slot.input?.full_name ?? "").trim();
      const named = fullName.length > 0;
      return {
        column: slot.column,
        prefix: slot.prefix,
        label: slot.label,
        fullName: named ? fullName : null,
        dob: named ? dateOrNull(slot.input?.dob) : null,
        nationality: named
          ? (slot.input?.nationality ?? "").trim() || null
          : null,
        photo:
          named && slot.input?.photo
            ? await ensureUnderCap(slot.input.photo, "photo")
            : null,
      };
    }),
  );

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
  officials.forEach((o) => {
    if (o.photo) validateFile(o.photo, "image", `${o.label} photo`);
  });
  prepared.forEach((p, i) => {
    const who = p.full_name.trim() || `Player ${i + 1}`;
    if (p.photo) validateFile(p.photo, "image", `${who}'s photo`);
    validateFile(p.proof_of_age, "doc", `${who}'s proof of age`);
  });

  const regId = data.id ?? newRegistrationId();
  const progress = data.progress;

  /* --------------------------- Storage paths ------------------------------ */
  // Every path this submission will write, built here and nowhere else, then
  // checked for collisions before the first upload. Keeping them together is
  // what makes that check possible — and stops the players loop from quietly
  // growing its own naming scheme again, which is how a whole squad's photos
  // ended up overwriting each other. See assertUniquePaths.
  const logoPath = teamLogo
    ? `${regId}/logo_${sanitizeFileName(teamLogo.name)}`
    : null;

  const coachPath = coachPhoto
    ? `${regId}/coach_${sanitizeFileName(coachPhoto.name)}`
    : null;

  // `official.prefix` is what keeps the four of them apart in one folder.
  const officialPaths = officials.map((official) =>
    official.photo
      ? `${regId}/${official.prefix}_${sanitizeFileName(official.photo.name)}`
      : null,
  );

  const pdfPath = data.receipt_pdf_blob ? `${regId}/summary.pdf` : null;

  // The slot number MUST stay in both of these. `index + 1` rather than a random
  // id on purpose: it is the same key `progress.playersSaved` uses, so a resumed
  // submit rebuilds byte-identical paths and re-uploads nothing.
  const playerPaths = prepared.map((player, index) => ({
    photo: player.photo
      ? `${regId}/photo_${index + 1}_${sanitizeFileName(player.photo.name)}`
      : null,
    age: `${regId}/age_${index + 1}_${sanitizeFileName(
      player.proof_of_age.name,
    )}`,
  }));

  assertUniquePaths([
    ...(logoPath
      ? [{ bucket: "team-logos", path: logoPath, label: "the team logo" }]
      : []),
    ...(coachPath
      ? [
          {
            bucket: "player-photos",
            path: coachPath,
            label: "the head coach's photo",
          },
        ]
      : []),
    ...officialPaths.flatMap((path, i) =>
      path
        ? [
            {
              bucket: "player-photos",
              path,
              label: `${officials[i].label}'s photo`,
            },
          ]
        : [],
    ),
    ...(pdfPath
      ? [
          {
            bucket: "registration-receipts",
            path: pdfPath,
            label: "the roster PDF",
          },
        ]
      : []),
    ...playerPaths.flatMap(({ photo, age }, i) => {
      const who = prepared[i].full_name.trim() || `player ${i + 1}`;
      return [
        ...(photo
          ? [{ bucket: "player-photos", path: photo, label: `${who}'s photo` }]
          : []),
        { bucket: "proof-of-age", path: age, label: `${who}'s proof of age` },
      ];
    }),
  ]);

  // Team logo — PUBLIC bucket (meant to be shown).
  report("Uploading your details...");
  let teamLogoUrl = "";
  if (teamLogo && logoPath) {
    await uploadToBucket("team-logos", logoPath, teamLogo, undefined, progress);
    teamLogoUrl = publicUrl("team-logos", logoPath);
  }

  // Coach passport headshot — PUBLIC. Reuses the player-photos bucket (same kind
  // of person photo, same visibility) so no extra bucket has to be provisioned.
  let coachPhotoUrl = "";
  if (coachPhoto && coachPath) {
    await uploadToBucket(
      "player-photos",
      coachPath,
      coachPhoto,
      undefined,
      progress,
    );
    coachPhotoUrl = publicUrl("player-photos", coachPath);
  }

  // The other officials' passport headshots — PUBLIC, same bucket and same
  // reasoning as the coach's. Uploaded before the registration insert because
  // their URLs are columns on that row.
  const officialColumns: Record<string, string | null> = {};
  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];
    const officialPath = officialPaths[i];
    let officialPhotoUrl: string | null = null;
    if (official.photo && officialPath) {
      await uploadToBucket(
        "player-photos",
        officialPath,
        official.photo,
        undefined,
        progress,
      );
      officialPhotoUrl = publicUrl("player-photos", officialPath);
    }
    officialColumns[`${official.column}_full_name`] = official.fullName;
    officialColumns[`${official.column}_dob`] = official.dob;
    officialColumns[`${official.column}_nationality`] = official.nationality;
    officialColumns[`${official.column}_photo_url`] = officialPhotoUrl;
  }

  // Roster PDF — PUBLIC bucket. The registrant downloads it from the
  // confirmation page, and the admin page links to the same URL.
  let receiptPdfUrl = "";
  if (data.receipt_pdf_blob && pdfPath) {
    await uploadToBucket(
      "registration-receipts",
      pdfPath,
      data.receipt_pdf_blob,
      "application/pdf",
      progress,
    );
    receiptPdfUrl = publicUrl("registration-receipts", pdfPath);
  }

  // Insert the registration with our client-chosen id — no .select() (anon has
  // no read policy) and no later UPDATE (all client UPDATEs are RLS-blocked).
  // 'pending_payment' is the only status the anon RLS policy lets us set for a
  // new row. Read it as "registered": an admin can only move it to 'rejected'
  // (cancelled) from the admin page.
  //
  // Skipped outright if a previous attempt already committed it. A duplicate-key
  // error counts as success for the same reason — see isDuplicateKey.
  if (!progress?.registrationSaved) {
    await insertWithRetry(
      "registrations",
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
        // Team manager / assistant coach / medic 1 / medic 2 — all NULL for a
        // team that doesn't have them. Never "" for the dates: see dateOrNull.
        ...officialColumns,
        receipt_pdf_url: receiptPdfUrl,
        payment_status: "pending_payment",
      },
      { duplicateIsSuccess: true },
    );
    if (progress) progress.registrationSaved = true;
  }

  // Upload each player's files and insert their row, referencing regId.
  for (let index = 0; index < prepared.length; index++) {
    if (progress?.playersSaved.has(index)) continue;

    const player = prepared[index];
    const paths = playerPaths[index];
    report(`Uploading players (${index + 1}/${prepared.length})...`);

    try {
      // Player photo — PUBLIC bucket (shown on squad pages). Optional.
      // Path built and collision-checked above, deliberately not here: building
      // it inline is exactly how it came to lack anything per-player.
      let photoUrl = "";
      if (player.photo && paths.photo) {
        await uploadToBucket(
          "player-photos",
          paths.photo,
          player.photo,
          undefined,
          progress,
        );
        photoUrl = publicUrl("player-photos", paths.photo);
      }

      // Proof of age — PRIVATE bucket. Store the PATH; read via signed URL.
      await uploadToBucket(
        "proof-of-age",
        paths.age,
        player.proof_of_age,
        undefined,
        progress,
      );

      await insertWithRetry("players", {
        registration_id: regId,
        full_name: player.full_name,
        dob: player.dob,
        nationality: player.nationality,
        position: player.position,
        jersey_number: player.jersey_number ?? null,
        photo_url: photoUrl, // public URL (safe to expose)
        proof_of_age_path: paths.age, // private path (sign on demand)
      });

      progress?.playersSaved.add(index);
    } catch (error) {
      // Tell the operator exactly where it stopped and that pressing Submit
      // again continues from here rather than starting a second team. Without
      // this they would go back, re-enter, and end up with a duplicate.
      const savedCount = progress?.playersSaved.size ?? index;
      throw new Error(
        `Saved ${savedCount} of ${prepared.length} players, then failed on ${
          player.full_name.trim() || `player ${index + 1}`
        }: ${errorMessage(error)}. Nothing already saved was lost — press Submit again to continue from this player.`,
      );
    }
  }

  return { id: regId, receipt_pdf_url: receiptPdfUrl };
}
