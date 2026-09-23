import type { SupabaseClient } from "@supabase/supabase-js";
import { storageSuffix } from "./team-auth";

/**
 * Shared data helpers for the team portal and the admin screens that resolve
 * its requests.
 *
 * These live together because both sides have to agree exactly: where a queued
 * document is parked, and what makes a player "this team's player". If /api/
 * team/upload and /api/admin/resolve-change each built their own answer, an
 * approval could read from a path an upload never wrote.
 */

/**
 * PRIVATE bucket holding minors' identity documents. Never make it public —
 * every read goes through a short-lived signed URL from a route that has first
 * checked who is asking.
 */
export const PROOF_BUCKET = "proof-of-age";

/**
 * Where a replacement proof-of-age document waits while it is unresolved.
 *
 * Under the registration's own folder (so it is cleaned up with the team) but
 * in a `pending/` subfolder, never at the player's canonical path. That
 * separation is the point: until the organiser approves it, the player's real
 * document must still be the one on file, so an upload cannot be allowed to
 * land on top of it. On approval the object is copied to a canonical path; on
 * rejection it is deleted.
 */
export function pendingDocumentPath(
  registrationId: string,
  changeId: string,
  fileName: string,
): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/)?.[0] ?? ".jpg";
  return `${registrationId}/pending/${changeId}${ext}`;
}

/**
 * Canonical path for a replacement document once it is approved.
 *
 * Carries the player id AND a fresh random suffix. Neither is decoration: the
 * player id keeps two players in the same team apart, and the suffix means the
 * new object never lands on a path any previous file owned. Phone galleries
 * name almost every picture `image.jpg`, and a whole squad's photos once
 * overwrote each other for exactly that reason — every path in this app now
 * carries something per-item. See assertUniquePaths in lib/api/registration.ts.
 */
export function approvedDocumentPath(
  registrationId: string,
  playerId: string,
  fileName: string,
): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/)?.[0] ?? ".jpg";
  return `${registrationId}/age_${playerId.slice(0, 8)}_${storageSuffix()}${ext}`;
}

/** Path for a replacement photo. Same per-item + random-suffix rule as above. */
export function replacementPhotoPath(
  registrationId: string,
  kind: string,
  fileName: string,
): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[0] ?? ".jpg";
  return `${registrationId}/${kind}_${storageSuffix()}${ext}`;
}

/**
 * Does this player belong to this registration?
 *
 * Called by every team route that takes a player id, before that id is used for
 * anything. A team's session proves which REGISTRATION it is; it proves nothing
 * about a player id typed into a request body. Without this check, changing one
 * number in a request would reach another team's player — and player rows hold
 * names, dates of birth and document paths for minors.
 *
 * Scoped with BOTH ids in the filter rather than fetching the player and
 * comparing in JavaScript, so there is no version of this that reads the row
 * first and forgets to check second.
 */
export async function playerBelongsToRegistration(
  supabase: SupabaseClient,
  playerId: string,
  registrationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("registration_id", registrationId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * Drop any unresolved request for the same field, so only the team's latest
 * ask is ever queued.
 *
 * Without this, editing a date of birth three times would leave three pending
 * rows, and the organiser would approve them one after another — each one
 * briefly making a superseded value live. One row per field means approving is
 * unambiguous.
 *
 * A superseded DOCUMENT also has an object in storage that nothing will ever
 * reference again, so it is deleted first. Storage failures are swallowed:
 * an orphaned file is untidy, whereas refusing the team's new request because
 * cleanup failed would be a dead end they cannot get out of.
 */
export async function supersedePending(
  supabase: SupabaseClient,
  registrationId: string,
  playerId: string | null,
  field: string,
): Promise<void> {
  let query = supabase
    .from("pending_changes")
    .select("id, new_value")
    .eq("registration_id", registrationId)
    .eq("field", field)
    .eq("status", "pending");

  query = playerId ? query.eq("player_id", playerId) : query.is("player_id", null);

  const { data: existing, error } = await query;
  if (error) throw error;
  if (!existing?.length) return;

  const orphanedPaths = existing
    .filter((row) => field === "proof_of_age_path" && row.new_value)
    .map((row) => row.new_value as string);

  if (orphanedPaths.length > 0) {
    try {
      await supabase.storage.from(PROOF_BUCKET).remove(orphanedPaths);
    } catch {
      // Untidy, not broken — see above.
    }
  }

  const { error: deleteError } = await supabase
    .from("pending_changes")
    .delete()
    .in(
      "id",
      existing.map((row) => row.id),
    );

  if (deleteError) throw deleteError;
}

/* -------------------------------------------------------------------------- */
/*  Cleaning up superseded objects                                            */
/* -------------------------------------------------------------------------- */

/**
 * Turn a public storage URL back into the object path inside its bucket.
 *
 * Public URLs look like
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Returns "" for anything that isn't one (an empty column, a hand-edited
 * value), so a caller can only ever be handed a path it could act on.
 */
export function pathFromPublicUrl(url: string, bucket: string): string {
  if (!url) return "";
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at === -1) return "";
  const path = url.slice(at + marker.length).split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Every column in this schema that can hold a storage reference.
 *
 * Listed in one place because the check below has to consider all of them: a
 * team logo column and a medic's photo column are different fields, but they
 * can point at the same object, and deleting it for one would break the other.
 */
const PLAYER_STORAGE_COLUMNS = ["photo_url", "proof_of_age_path"] as const;
const REGISTRATION_STORAGE_COLUMNS = [
  "team_logo_url",
  "coach_photo_url",
  "manager_photo_url",
  "assistant_coach_photo_url",
  "medic1_photo_url",
  "medic2_photo_url",
] as const;

/**
 * Delete a storage object a row has stopped pointing at — but ONLY if no other
 * row still points at it.
 *
 * WHY THE CHECK EXISTS, AND WHY IT IS NOT OPTIONAL. Player files used to be
 * stored at a path that identified nothing about the player, and since phone
 * galleries name almost every picture `image.jpg`, a whole squad's uploads
 * targeted one object. Three registrations were saved that way, and in those
 * rows MANY PLAYERS STILL SHARE ONE photo_url AND ONE proof_of_age_path. They
 * are in the U16 league — the closed tournament whose photos are the reason
 * this portal exists — so they are the rows most likely to be edited first.
 *
 * Deleting the superseded object there would take the image away from every
 * other player still referencing it, turning a partial loss into a total one.
 * So the old object is removed only once nothing references it.
 *
 * Scoped to the registration: every path this app writes is namespaced under
 * its registration's UUID, so an object belonging to one team can only ever be
 * referenced from within that team's rows.
 *
 * Never throws. A failed cleanup leaves an orphaned file, which costs a few KB;
 * a cleanup that could fail a team's upload would cost them the edit.
 *
 * CALL ORDER MATTERS: only after the row has been updated to its new value. Run
 * beforehand, the row still points at this path, the check says "referenced",
 * and nothing is ever cleaned up.
 */
export async function deleteIfUnreferenced(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  registrationId: string,
): Promise<void> {
  if (!path) return;

  try {
    // The value stored in a player/registration column: a path for the private
    // bucket, a full public URL for the public ones. Both forms are compared,
    // so this works whichever kind of reference the caller holds.
    const publicUrlValue = supabase.storage.from(bucket).getPublicUrl(path).data
      .publicUrl;
    const candidates = new Set([path, publicUrlValue]);

    // Fetched and compared in JavaScript rather than filtered with `.or()`:
    // a PostgREST or-filter is comma-separated, so a path containing a comma or
    // a parenthesis would change the meaning of the query instead of failing
    // it. A team has at most 25 players, so reading the rows costs nothing and
    // there is no escaping to get wrong.
    const [players, registrations] = await Promise.all([
      supabase
        .from("players")
        .select(PLAYER_STORAGE_COLUMNS.join(","))
        .eq("registration_id", registrationId),
      supabase
        .from("registrations")
        .select(REGISTRATION_STORAGE_COLUMNS.join(","))
        .eq("id", registrationId),
    ]);

    // A failed check counts as "still referenced". Not knowing is a reason to
    // keep a file, never a reason to delete one.
    if (players.error || registrations.error) return;

    // `select()` is given a string joined at runtime, which supabase-js cannot
    // resolve to a row type — it falls back to its parse-failure type. The rows
    // are genuinely untyped here, so they are widened to `unknown` and read as
    // plain objects; every value is checked with `typeof` before it is used.
    const rows: unknown[] = [
      ...(players.data ?? []),
      ...(registrations.data ?? []),
    ];

    const referenced = rows.some((row) =>
      Object.values((row ?? {}) as Record<string, unknown>).some(
        (value) => typeof value === "string" && candidates.has(value),
      ),
    );

    if (referenced) return;

    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // Orphaned file. See above.
  }
}

/* -------------------------------------------------------------------------- */
/*  Server-side file validation                                               */
/* -------------------------------------------------------------------------- */

/**
 * The 120KB ceiling, restated for the server.
 *
 * lib/images.ts owns this number, but importing it here would pull a module
 * full of `document.createElement` and `canvas` into a route handler. The
 * constant is duplicated rather than the module imported; if the cap ever
 * changes, both move together.
 */
export const MAX_UPLOAD_BYTES = 120 * 1024;

const PHOTO_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const DOC_MIME = [...PHOTO_MIME, "application/pdf"];

/**
 * Validate an uploaded file server-side.
 *
 * The browser compresses before sending and the same check runs there, but a
 * route handler cannot assume its caller was the browser. This is the last
 * place a file can be refused before it is written to storage, so type and
 * size are both checked here regardless of what the client claims to have done.
 */
export function validateUpload(
  file: File,
  kind: "photo" | "document",
): string | null {
  if (!file || typeof file === "string") return "No file was uploaded.";
  if (file.size === 0) return "That file appears to be empty.";

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is too large (${Math.round(
      file.size / 1024,
    )}KB, max ${Math.round(MAX_UPLOAD_BYTES / 1024)}KB). Please choose a smaller image.`;
  }

  const allowed = kind === "photo" ? PHOTO_MIME : DOC_MIME;
  const type = (file.type || "").toLowerCase();

  // Falls back to the extension when the browser sends no MIME type, which
  // some Android file pickers genuinely do.
  if (!type) {
    const extOk =
      kind === "photo"
        ? /\.(jpe?g|png|webp)$/i.test(file.name)
        : /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    return extOk
      ? null
      : `That file must be ${kind === "photo" ? "an image (JPG, PNG or WEBP)" : "an image or a PDF"}.`;
  }

  if (!allowed.includes(type)) {
    return `That file must be ${kind === "photo" ? "an image (JPG, PNG or WEBP)" : "an image or a PDF"}.`;
  }

  return null;
}
