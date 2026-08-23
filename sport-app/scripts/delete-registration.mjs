/**
 * Delete a registration and everything attached to it: its player rows and its
 * uploaded files in all four storage buckets.
 *
 * Written to clean up test submissions, but it works on any registration — so
 * it refuses to touch anything until you pass --yes. Run it without that flag
 * first and read what it says it will remove.
 *
 * Usage (from the sport-app folder):
 *
 *   # see what a reference points at, delete nothing
 *   node --env-file=.env.local scripts/delete-registration.mjs E2D3955A
 *
 *   # actually delete it
 *   node --env-file=.env.local scripts/delete-registration.mjs E2D3955A --yes
 *
 *   # match on academy name instead (substring, case-insensitive)
 *   node --env-file=.env.local scripts/delete-registration.mjs --academy "ZZ TEST" --yes
 *
 * The reference is the 8-character code shown on the confirmation page and
 * printed on the summary PDF.
 *
 * --env-file is what keeps the service_role key out of your shell history and
 * off the command line; never paste the key as an argument.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKETS = [
  "team-logos",
  "player-photos",
  "proof-of-age",
  "registration-receipts",
];

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const academyIdx = args.indexOf("--academy");
const academy = academyIdx >= 0 ? args[academyIdx + 1] : null;
const reference = args.find((a) => !a.startsWith("--") && a !== academy);

if (!reference && !academy) {
  console.error(
    "Usage: node --env-file=.env.local scripts/delete-registration.mjs <REFERENCE> [--yes]\n" +
      "   or: node --env-file=.env.local scripts/delete-registration.mjs --academy \"<name>\" [--yes]",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with:  node --env-file=.env.local scripts/delete-registration.mjs ...",
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ---------------------------------------------------------------- find rows */

// The reference is a slice of the UUID, which PostgREST can't pattern-match on
// a uuid column — so filter in JS. The table is small (one row per team), so
// reading it whole costs nothing.
let query = db
  .from("registrations")
  .select("id, academy_name, contact_name, created_at, payment_status");
if (academy) query = query.ilike("academy_name", `%${academy}%`);

const { data: rows, error: findError } = await query;
if (findError) {
  console.error("Could not read registrations:", findError.message);
  process.exit(1);
}

const targets = reference
  ? rows.filter(
      (r) => r.id.slice(0, 8).toUpperCase() === reference.toUpperCase(),
    )
  : rows;

if (targets.length === 0) {
  console.log(
    reference
      ? `No registration has reference ${reference.toUpperCase()}. Nothing to do.`
      : `No registration's academy name contains "${academy}". Nothing to do.`,
  );
  process.exit(0);
}

/* -------------------------------------------------------- show what we found */

console.log(
  `${targets.length} registration${targets.length === 1 ? "" : "s"} matched:\n`,
);

for (const reg of targets) {
  const { data: players } = await db
    .from("players")
    .select("full_name")
    .eq("registration_id", reg.id);

  const files = [];
  for (const bucket of BUCKETS) {
    const { data: objects } = await db.storage.from(bucket).list(reg.id);
    for (const object of objects ?? []) files.push(`${bucket}/${reg.id}/${object.name}`);
  }
  reg._files = files;

  console.log(`  ${reg.id.slice(0, 8).toUpperCase()}  ${reg.academy_name}`);
  console.log(`     contact:  ${reg.contact_name}`);
  console.log(`     created:  ${reg.created_at}`);
  console.log(`     status:   ${reg.payment_status}`);
  console.log(
    `     players:  ${players?.length ?? 0}${
      players?.length ? ` (${players.map((p) => p.full_name).join(", ")})` : ""
    }`,
  );
  console.log(`     files:    ${files.length}`);
  for (const file of files) console.log(`       - ${file}`);
  console.log("");
}

if (!confirmed) {
  console.log(
    "Nothing was deleted. Re-run with --yes to remove the rows and files listed above.",
  );
  process.exit(0);
}

/* ------------------------------------------------------------------- delete */

// Files first. If a later step fails, an orphaned row is easy to find and retry;
// orphaned files in a bucket are not, because the id that named them is gone.
let failures = 0;

for (const reg of targets) {
  const ref = reg.id.slice(0, 8).toUpperCase();

  for (const bucket of BUCKETS) {
    const paths = reg._files
      .filter((f) => f.startsWith(`${bucket}/`))
      .map((f) => f.slice(bucket.length + 1));
    if (paths.length === 0) continue;

    const { error } = await db.storage.from(bucket).remove(paths);
    if (error) {
      failures++;
      console.error(`  ${ref}  FAILED to remove from ${bucket}: ${error.message}`);
    } else {
      console.log(`  ${ref}  removed ${paths.length} file(s) from ${bucket}`);
    }
  }

  const { error: playerError } = await db
    .from("players")
    .delete()
    .eq("registration_id", reg.id);
  if (playerError) {
    failures++;
    console.error(`  ${ref}  FAILED to delete players: ${playerError.message}`);
  } else {
    console.log(`  ${ref}  deleted player rows`);
  }

  const { error: regError } = await db
    .from("registrations")
    .delete()
    .eq("id", reg.id);
  if (regError) {
    failures++;
    console.error(`  ${ref}  FAILED to delete registration: ${regError.message}`);
  } else {
    console.log(`  ${ref}  deleted registration`);
  }
}

/* ------------------------------------------------------------------- verify */

// Deleting is the easy part; proving it happened is the point. Storage remove()
// can report success on objects a policy quietly filtered out, so re-list.
let leftover = 0;
for (const reg of targets) {
  const { data: stillThere } = await db
    .from("registrations")
    .select("id")
    .eq("id", reg.id);
  if (stillThere?.length) leftover++;

  for (const bucket of BUCKETS) {
    const { data: objects } = await db.storage.from(bucket).list(reg.id);
    leftover += (objects ?? []).length;
  }
}

console.log("");
if (failures === 0 && leftover === 0) {
  console.log("Done. Nothing left behind.");
} else {
  console.log(
    `Finished with ${failures} error(s); ${leftover} item(s) still present. Re-run to retry.`,
  );
  process.exit(1);
}
