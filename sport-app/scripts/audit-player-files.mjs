/**
 * Read-only audit: find registrations where several players share one photo or
 * one proof-of-age document.
 *
 * WHY THIS EXISTS
 * Player files used to be stored at `<regId>/photo_<filename>`, with nothing in
 * the path to tell one player from another. Two players whose files happened to
 * share a filename therefore wrote to the SAME storage object — the second
 * overwrote the first, and both player rows ended up with the same URL. On the
 * admin roster that shows as one face repeated down the whole squad. The roster
 * PDF looked correct because it is built from the in-memory files, before any
 * upload happens.
 *
 * The path now carries the player's slot number, so new registrations cannot
 * collide. This script reports which EXISTING rows were affected and how many
 * distinct files actually survived in each bucket — i.e. what is recoverable and
 * what has to be re-uploaded.
 *
 * Usage (from the sport-app folder):
 *
 *   node --env-file=.env.local scripts/audit-player-files.mjs
 *
 * Writes nothing. --env-file is what keeps the service_role key off the command
 * line and out of your shell history; never paste the key as an argument.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with:  node --env-file=.env.local scripts/audit-player-files.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

/** Group values -> the players holding them, keeping only the shared ones. */
function duplicates(players, field) {
  const groups = new Map();
  for (const player of players) {
    const value = player[field];
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(player.full_name || "(unnamed)");
  }
  return [...groups.entries()].filter(([, holders]) => holders.length > 1);
}

/** Names of the objects stored directly under `<bucket>/<regId>/`. */
async function listFolder(bucket, regId) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(regId, { limit: 1000 });
  if (error) return { error: error.message, names: [] };
  return { error: null, names: (data ?? []).map((entry) => entry.name) };
}

const { data: registrations, error } = await supabase
  .from("registrations")
  .select(
    `id, academy_name, created_at,
     players ( id, full_name, photo_url, proof_of_age_path )`,
  )
  .order("created_at", { ascending: true });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

console.log(`Auditing ${registrations.length} registration(s).\n`);

let affected = 0;

for (const reg of registrations) {
  const players = reg.players ?? [];
  const photoDupes = duplicates(players, "photo_url");
  const ageDupes = duplicates(players, "proof_of_age_path");

  if (photoDupes.length === 0 && ageDupes.length === 0) continue;

  affected++;
  const when = new Date(reg.created_at).toISOString().slice(0, 10);
  console.log(`${reg.academy_name}  (${when})`);
  console.log(`  registration ${reg.id}`);
  console.log(`  ${players.length} player row(s)`);

  for (const [value, holders] of photoDupes) {
    console.log(
      `  PHOTO shared by ${holders.length}: ${holders.join(", ")}\n` +
        `    -> ${value}`,
    );
  }
  for (const [value, holders] of ageDupes) {
    console.log(
      `  PROOF OF AGE shared by ${holders.length}: ${holders.join(", ")}\n` +
        `    -> ${value}`,
    );
  }

  // What actually survived on disk. A count far below the player count means
  // the other files were overwritten and are gone, not merely mislinked.
  for (const bucket of ["player-photos", "proof-of-age"]) {
    const { error: listError, names } = await listFolder(bucket, reg.id);
    if (listError) {
      console.log(`  ${bucket}: could not list (${listError})`);
      continue;
    }
    console.log(`  ${bucket}: ${names.length} object(s) -> ${names.join(", ")}`);
  }

  console.log("");
}

if (affected === 0) {
  console.log("No shared player files found. Nothing to repair.");
} else {
  console.log(
    `${affected} registration(s) affected.\n` +
      "Files listed above are all that survived; any player whose file was\n" +
      "overwritten has to have that file re-uploaded. New registrations are not\n" +
      "affected — their paths carry the player's slot number.",
  );
}
