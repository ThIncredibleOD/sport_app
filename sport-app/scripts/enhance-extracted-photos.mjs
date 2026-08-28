/**
 * Make the best possible ID-card photo out of a 44x44 PDF thumbnail, and work
 * out which player's photo survived at full resolution.
 *
 * READ THIS FIRST — WHAT UPSCALING CAN AND CANNOT DO
 * The thumbnails from scripts/extract-pdf-photos.mjs are 44x44 pixels. This
 * script resamples them to card size with a good kernel, which removes the
 * blocky, jagged look and gives clean edges. It does NOT recover detail that
 * isn't there: 44x44 holds roughly 1,900 pixels of face, and no amount of
 * resampling invents the other 100,000. Expect a soft, painterly portrait that
 * is clearly the right person but is not a sharp photograph.
 *
 * Deliberately NOT done here: AI "face enhancement". Those models hallucinate
 * plausible features — a different nose, different eyes — which is the wrong
 * trade for an identity document belonging to a child. If a card has to show a
 * face, it should be a soft real one, not a sharp invented one.
 *
 * WHAT IT ALSO DOES
 * One full-resolution photo per damaged team DID survive in storage: the last
 * upload won the collision. Every player row points at it, so the database can't
 * say whose face it is. This script finds out by shrinking the survivor to 44x44
 * and comparing it against each extracted thumbnail — that player needs no
 * upscale at all.
 *
 * Usage (from the sport-app folder), after running extract-pdf-photos.mjs:
 *
 *   node --env-file=.env.local scripts/enhance-extracted-photos.mjs
 *
 * Reads ./extracted-photos/, writes ./extracted-photos/<team>/upscaled/.
 * Touches nothing in the database or in storage.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with:  node --env-file=.env.local scripts/enhance-extracted-photos.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const OUT_ROOT = "extracted-photos";
/** 352 = exactly 8x the 44px source, so every source pixel maps to a clean block. */
const TARGET = 352;

/* -------------------------------------------------------------------------- */
/*  Upscaling                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 44 -> 352 in three doublings rather than one 8x jump.
 *
 * WHY: a single large Lanczos step applies its kernel over a huge output
 * neighbourhood and produces visible ringing halos around high-contrast edges
 * (hairline, collar, eyes). Doubling repeatedly keeps each kernel local, so the
 * halos never build up. A light sharpen after each step restores the edge
 * contrast the resample softens — applied gently and repeatedly rather than once
 * and hard, which is what makes cheap upscales look crunchy.
 *
 * The initial 0.3px blur is there on purpose: the source is JPEG at quality 0.7,
 * so it carries 8x8 block edges that are compression artefacts, not features.
 * Blurring below the block size removes them before anything gets magnified —
 * otherwise the upscale faithfully enlarges the artefacts too.
 */
async function upscale(inputPath) {
  let image = sharp(inputPath).blur(0.3);
  let size = 44;

  while (size * 2 <= TARGET) {
    size *= 2;
    const buffer = await image
      .resize(size, size, { kernel: "lanczos3", fit: "fill" })
      .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.5 })
      .png()
      .toBuffer();
    image = sharp(buffer);
  }

  // Land exactly on TARGET if the doublings stopped short of it.
  return image
    .resize(TARGET, TARGET, { kernel: "lanczos3", fit: "fill" })
    .sharpen({ sigma: 0.8, m1: 0.4, m2: 1.2 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/* -------------------------------------------------------------------------- */
/*  Matching the surviving full-resolution photo to a player                   */
/* -------------------------------------------------------------------------- */

/** Raw 44x44 greyscale pixels — the common ground for comparing two images. */
async function fingerprint(input) {
  return sharp(input)
    .resize(44, 44, { kernel: "lanczos3", fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
}

/** Mean absolute difference per pixel (0 = identical, 255 = opposite). */
function distance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

let teamDirs;
try {
  teamDirs = (await readdir(OUT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
} catch {
  console.error(
    `No ./${OUT_ROOT} folder. Run scripts/extract-pdf-photos.mjs first.`,
  );
  process.exit(1);
}

const { data: registrations, error } = await supabase
  .from("registrations")
  .select(`id, academy_name, players ( full_name, photo_url )`);

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

for (const teamDir of teamDirs) {
  const dir = path.join(OUT_ROOT, teamDir);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg"));
  const thumbs = files.filter((f) => /-44x44\.jpg$/.test(f)).sort();

  console.log(`\n${teamDir}`);
  if (thumbs.length === 0) {
    console.log("  no 44x44 thumbnails here — nothing to upscale");
    continue;
  }

  /* ---- which surviving full-res photo is whose? ---- */
  // The folder name ends in the registration id's first 8 characters.
  const idPrefix = teamDir.slice(-8);
  const reg = registrations.find((r) => r.id.startsWith(idPrefix));

  if (reg) {
    const { data: objects } = await supabase.storage
      .from("player-photos")
      .list(reg.id, { limit: 1000 });

    const survivors = (objects ?? []).filter((o) => o.name.startsWith("photo_"));

    for (const survivor of survivors) {
      const { data: blob, error: dlError } = await supabase.storage
        .from("player-photos")
        .download(`${reg.id}/${survivor.name}`);
      if (dlError) {
        console.log(`  ${survivor.name}: could not download (${dlError.message})`);
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      const survivorPrint = await fingerprint(buffer);

      const scored = [];
      for (const thumb of thumbs) {
        scored.push({
          thumb,
          score: distance(survivorPrint, await fingerprint(path.join(dir, thumb))),
        });
      }
      scored.sort((a, b) => a.score - b.score);

      const best = scored[0];
      const runnerUp = scored[1];
      // A clear win means the gap to second place is meaningful. If the two are
      // close, say so rather than asserting a match — these are ID photos.
      const confident = runnerUp ? runnerUp.score - best.score > 2 : true;

      console.log(
        `  full-resolution survivor ${survivor.name} (${meta.width}x${meta.height}) ` +
          `matches ${best.thumb}\n` +
          `    difference ${best.score.toFixed(1)} vs next-best ${
            runnerUp ? runnerUp.score.toFixed(1) : "n/a"
          } — ${confident ? "confident" : "TOO CLOSE TO CALL, check by eye"}`,
      );
    }
  }

  /* ---- upscale every thumbnail ---- */
  const upDir = path.join(dir, "upscaled");
  await mkdir(upDir, { recursive: true });

  for (const thumb of thumbs) {
    const out = path.join(upDir, thumb.replace(/-44x44\.jpg$/, `-${TARGET}px.png`));
    await writeFile(out, await upscale(path.join(dir, thumb)));
    console.log(`  ${TARGET}x${TARGET}  ${out}`);
  }
}

console.log(
  `\nDone. These are resampled ${TARGET}x${TARGET} versions of 44x44 sources —\n` +
    `clean edges, but no detail that wasn't in the thumbnail. Before settling for\n` +
    `them, check the device the photos were uploaded from: the originals were\n` +
    `only ever read from it, never moved, so they should still be in its gallery\n` +
    `or download folder.`,
);
