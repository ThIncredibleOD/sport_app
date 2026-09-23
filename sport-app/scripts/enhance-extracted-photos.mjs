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
 * Reads ./extracted-photos/, and per team writes:
 *   upscaled/   352x352 squares
 *   id-cards/   295x378 at 300dpi (25x32mm), named -SHARP or -soft so whoever
 *               prints them can see which are real photographs at a glance
 *
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

/**
 * ID-card photo size: 25x32mm at 300dpi, the usual passport-style slot.
 * Written with density metadata so dropping the file into a layout gives that
 * physical size without anyone having to scale it by hand.
 */
const ID_W = 295;
const ID_H = 378;
const ID_DPI = 300;

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

/**
 * Lift a dark face to a printable brightness without wrecking the background.
 *
 * THE PROBLEM THESE PHOTOS HAVE
 * They were taken indoors facing a window or a white wall, so the camera exposed
 * for the background: shirt and wall sit near 255 while the face sits around 30.
 * The frame as a whole is bright, so it is not "underexposed" in any way a mean
 * or a histogram stretch would notice — sharp's own .normalise() finds nothing to
 * do, and .gamma() is a no-op outside a resize pipeline. Multiplying brightness
 * does lift the face, but it pushes the already-white background past 255 and the
 * shirt turns into a flat white blob.
 *
 * WHAT THIS DOES INSTEAD
 * A shadow-lift tone curve, out = 255*(in/255)^(1/g), applied through a 256-entry
 * lookup table on the raw pixels. The curve pins both ends — 0 stays 0 and 255
 * stays 255 — and bends hardest in the shadows, so a face at 35 rises to ~120
 * while a shirt at 235 moves only to ~242. Nothing clips.
 *
 * `g` is chosen per photo from the 30th-percentile grey level of the subject
 * region, not from its mean: the mean is dominated by the bright background,
 * which is exactly the measurement that made the first attempt at this do
 * nothing. A percentile finds the dark subject instead. Solving the curve for
 * that level makes the correction self-limiting — a photo already sitting at the
 * target gets g = 1.0 and is passed through untouched.
 *
 * This is tone mapping. It reveals detail already recorded in the pixels and
 * invents none, which is the line this script does not cross for a child's ID
 * photo. Capped at 2.4 because past that the shadows hold nothing but sensor
 * noise and lifting only makes the noise visible.
 */
const LIFT_TARGET = 110; // where the subject's shadow level should land, 0-255
const LIFT_MAX = 2.4;

function liftTable(gamma) {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    table[i] = Math.round(255 * Math.pow(i / 255, 1 / gamma));
  }
  return table;
}

/** 30th-percentile grey level over the subject area (centre, upper two thirds). */
async function shadowLevel(buffer, width, height) {
  const pixels = await sharp(buffer)
    .extract({
      left: Math.round(width * 0.25),
      top: Math.round(height * 0.12),
      width: Math.round(width * 0.5),
      height: Math.round(height * 0.58),
    })
    .greyscale()
    .raw()
    .toBuffer();

  const histogram = new Array(256).fill(0);
  for (const value of pixels) histogram[value]++;

  const needed = pixels.length * 0.3;
  let cumulative = 0;
  for (let level = 0; level < 256; level++) {
    cumulative += histogram[level];
    if (cumulative >= needed) return level;
  }
  return 255;
}

async function autoExpose(buffer, width, height) {
  const shadow = await shadowLevel(buffer, width, height);
  const gamma = Math.min(
    LIFT_MAX,
    Math.max(1, Math.log(Math.max(shadow, 1) / 255) / Math.log(LIFT_TARGET / 255)),
  );

  if (gamma <= 1.02) return { buffer, gamma: 1, shadow };

  const table = liftTable(gamma);
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i++) data[i] = table[data[i]];

  const lifted = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    // The curve is applied per channel, which flattens colour slightly. A small
    // saturation nudge puts it back; luminance contrast is left alone, since
    // adding any would re-darken the face the lift just recovered.
    .modulate({ saturation: 1.12 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { buffer: lifted, gamma, shadow };
}

/**
 * A print-ready 295x378 portrait for an ID card.
 *
 * `fit: "cover"` crops the sides rather than padding with white bands, and never
 * stretches — a distorted face on an identity document is worse than a tight one.
 * The source is already a centre crop (the PDF thumbnail was made with cover fit
 * too), so the head sits in the middle and the ~11% taken off each side is
 * background. Check the output by eye for anyone with wide shoulders in frame.
 *
 * `fromFullRes` skips the upscale chain entirely: those four photos are real
 * 540x720 (or 405x720) originals, so this is a DOWNSCALE for them and the result
 * is a genuinely sharp card photo, not a rescued one.
 */
async function idCard(input, fromFullRes) {
  const source = fromFullRes ? sharp(input) : sharp(await upscale(input));
  const resized = await source
    .resize(ID_W, ID_H, {
      kernel: "lanczos3",
      fit: "cover",
      // A full-res 540x720 is TALLER than the card ratio, so the crop comes off
      // the height — take it from the bottom (chest) and keep the head, which is
      // what an ID photo needs. The upscaled square is cropped on the WIDTH
      // instead, and it is already a symmetric centre crop, so centre it.
      position: fromFullRes ? "top" : "centre",
    })
    .png()
    .toBuffer();

  // Exposure before the final sharpen: sharpening a dark frame first would just
  // sharpen its noise, and the lift would then magnify that.
  const { buffer, gamma, shadow } = await autoExpose(resized, ID_W, ID_H);

  const out = await sharp(buffer)
    .sharpen({ sigma: 0.7, m1: 0.4, m2: 1.1 })
    .withMetadata({ density: ID_DPI })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { out, gamma, shadow };
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

  /* ---- print-ready ID card photos ---- */
  // Where a full-resolution original survived the overwrite, use it instead of
  // the thumbnail. Matched by the name slug both filenames were built from.
  const fullRes = new Map(
    files
      .filter((f) => f.startsWith("FULL-RES-"))
      .map((f) => [f.replace(/^FULL-RES-/, "").replace(/\.jpg$/, ""), f]),
  );

  const cardDir = path.join(dir, "id-cards");
  await mkdir(cardDir, { recursive: true });

  for (const thumb of thumbs) {
    const who = /^\d+-(player-\d+-.+)-44x44\.jpg$/.exec(thumb)?.[1];
    if (!who) continue;

    const slug = who.replace(/^player-\d+-/, "");
    const survivor = fullRes.get(slug);
    // The suffix is the point: it tells whoever prints the cards which photos are
    // real and which are rescued 44x44 thumbnails, without them having to guess.
    const source = survivor ? path.join(dir, survivor) : path.join(dir, thumb);
    const out = path.join(cardDir, `${who}-${survivor ? "SHARP" : "soft"}.png`);

    const { out: bytes, gamma, shadow } = await idCard(source, Boolean(survivor));
    await writeFile(out, bytes);

    const lift =
      gamma > 1
        ? `shadow ${shadow}/255 lifted, curve ${gamma.toFixed(2)}`
        : `shadow ${shadow}/255, no lift needed`;
    console.log(
      `  ${ID_W}x${ID_H} @${ID_DPI}dpi  ${out}\n` +
        `      ${survivor ? "full-res original, " : ""}${lift}`,
    );
  }
}

console.log(
  `\nDone.\n` +
    `  <team>/upscaled/   ${TARGET}x${TARGET} square, resampled from 44x44\n` +
    `  <team>/id-cards/   ${ID_W}x${ID_H} at ${ID_DPI}dpi = 25x32mm, ready to place\n\n` +
    `Files marked SHARP came from a surviving full-resolution original and are\n` +
    `true photographs. Files marked soft are rescued 44x44 thumbnails: clean\n` +
    `edges, right person, but no fine detail — no resampling invents the ~100,000\n` +
    `pixels the thumbnail never held. Before settling for those, check the device\n` +
    `the photos were uploaded from: the originals were only ever read from it,\n` +
    `never moved, so they should still be in its gallery or download folder.`,
);
