import { supabase } from "../supabase";

export interface PlayerInput {
  full_name: string;
  dob: string;
  nationality: string;
  position: string;
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
  players: PlayerInput[];
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
      `${label} must be ${kind === "image" ? "an image (JP, PNG, WEBP)" : "a PDF or image"}.`,
    );
  }
}

/**
 * Upload a validated file and return its storage PATH (not a URL).
 * Use getPublicUrl (public buckets) or getSignedUrl (private buckets) to read.
 */
async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
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

/* -------------------------------------------------------------------------- */
/*  1. Submit registration + upload logo, player photos & documents           */
/* -------------------------------------------------------------------------- */

export async function submitRegistration(data: RegistrationInput) {
  // Get Tournament ID from slug
  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", data.tournament_slug)
    .single();

  if (tourneyError || !tournament)
    throw new Error("Invalid tournament selected.");

  // Validate everything up front so we don't create a half-written record.
  if (data.team_logo) validateFile(data.team_logo, "image", "Team logo");
  data.players.forEach((p, i) => {
    if (p.photo) validateFile(p.photo, "image", `Player ${i + 1} photo`);
    validateFile(p.consent_form, "doc", `Player ${i + 1} consent form`);
    validateFile(p.proof_of_age, "doc", `Player ${i + 1} proof of age`);
  });

  // Upload Team Logo — PUBLIC bucket (meant to be shown)
  let teamLogoUrl = "";
  if (data.team_logo) {
    const logoPath = `logos/${Date.now()}_${sanitizeFileName(data.team_logo.name)}`;
    await uploadToBucket("team-logos", logoPath, data.team_logo);
    teamLogoUrl = publicUrl("team-logos", logoPath);
  }

  // Insert main registration record
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert([
      {
        tournament_id: tournament.id,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        academy_name: data.academy_name,
        team_logo_url: teamLogoUrl,
        coach_full_name: data.coach_full_name,
        coach_dob: data.coach_dob,
        coach_nationality: data.coach_nationality,
        payment_status: "pending_upload",
      },
    ])
    .select()
    .single();

  if (regError) throw regError;

  // Upload player files and create DB records for EVERY player
  for (const player of data.players) {
    // Player photo — PUBLIC bucket (shown on squad pages). Optional.
    let photoUrl = "";
    if (player.photo) {
      const photoPath = `${reg.id}/${Date.now()}_photo_${sanitizeFileName(player.photo.name)}`;
      await uploadToBucket("player-photos", photoPath, player.photo);
      photoUrl = publicUrl("player-photos", photoPath);
    }

    // Consent form — PRIVATE bucket. Store the PATH; read via signed URL.
    const consentPath = `${reg.id}/${Date.now()}_consent_${sanitizeFileName(player.consent_form.name)}`;
    await uploadToBucket("consent-forms", consentPath, player.consent_form);

    // Proof of age — PRIVATE bucket. Store the PATH; read via signed URL.
    const agePath = `${reg.id}/${Date.now()}_age_${sanitizeFileName(player.proof_of_age.name)}`;
    await uploadToBucket("proof-of-age", agePath, player.proof_of_age);

    const { error: playerErr } = await supabase.from("players").insert([
      {
        registration_id: reg.id,
        full_name: player.full_name,
        dob: player.dob,
        nationality: player.nationality,
        position: player.position,
        photo_url: photoUrl, // public URL (safe to expose)
        consent_form_path: consentPath, // private path (sign on demand)
        proof_of_age_path: agePath, // private path (sign on demand)
      },
    ]);

    if (playerErr) throw playerErr;
  }

  return reg;
}

/* -------------------------------------------------------------------------- */
/*  2. Upload payment receipt & update status                                 */
/* -------------------------------------------------------------------------- */

export async function uploadPaymentReceipt(
  registrationId: string,
  receiptFile: File,
) {
  validateFile(receiptFile, "doc", "Payment receipt");

  // Receipts — PRIVATE bucket. Store the PATH; read via signed URL.
  const receiptPath = `${registrationId}/${Date.now()}_receipt_${sanitizeFileName(receiptFile.name)}`;
  await uploadToBucket("receipts", receiptPath, receiptFile);

  const { data, error: updateErr } = await supabase
    .from("registrations")
    .update({
      payment_receipt_path: receiptPath,
      payment_status: "pending_verification",
    })
    .eq("id", registrationId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return data;
}
