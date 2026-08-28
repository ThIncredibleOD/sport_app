/**
 * Pull every embedded image back out of a team's roster PDF.
 *
 * WHY THIS EXISTS
 * Player photos used to be stored at `<regId>/photo_<filename>` — no per-player
 * part in the path — so a squad whose files were all called `image.jpg` wrote to
 * one storage object and overwrote each other. The roster PDF was generated
 * from the files still in the browser's memory, so it is the ONLY remaining copy
 * of those photos.
 *
 * This extracts them. Read the reported pixel size before planning anything with
 * the output: lib/pdf/generateReceipt.ts re-encodes each player photo through a
 * 44x44 canvas before embedding it, and the coach headshot through a 90x90 one,
 * so what comes out is a thumbnail, not the original upload.
 *
 * Images are written in the order the PDF draws them, which is the order of the
 * roster table — logo first, then the coach, then player 1..N. Each file is
 * named with that position so it can be lined up against the roster listing.
 *
 * Usage (from the sport-app folder):
 *
 *   node --env-file=.env.local scripts/extract-pdf-photos.mjs
 *   node --env-file=.env.local scripts/extract-pdf-photos.mjs <regId|academy name>
 *
 * With no argument it does every registration whose players share a photo — the
 * ones the bug actually damaged. Output goes to ./extracted-photos/<team>/.
 *
 * Writes only to that folder; touches nothing in the database or in storage.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with:  node --env-file=.env.local scripts/extract-pdf-photos.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const filter = process.argv[2] ?? null;
const OUT_ROOT = "extracted-photos";

/* -------------------------------------------------------------------------- */
/*  JPEG / PDF parsing                                                        */
/* -------------------------------------------------------------------------- */

/**
 * True pixel dimensions of a JPEG, read from its SOF (Start Of Frame) marker.
 *
 * This is the number that decides whether an extracted photo is usable. It is
 * read from the image itself rather than from the PDF's /Width and /Height,
 * because those describe how the PDF *labels* the image and we want the truth.
 */
function jpegSize(bytes) {
  let i = 2; // skip SOI (FFD8)
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
      };
    }
    i += 2 + length;
  }
  return null;
}

const ascii = (bytes) => Buffer.from(bytes).toString("latin1");

/**
 * Every JPEG image embedded in a PDF, in file order.
 *
 * A JPEG inside a PDF is stored verbatim in a /DCTDecode stream, so the bytes
 * between `stream` and `endstream` are already a complete, valid .jpg — no
 * decoding or re-encoding needed, which is why this can be done without a PDF
 * library. Non-JPEG images (/FlateDecode bitmaps) are skipped: jsPDF only ever
 * writes DCTDecode here, so anything else is not ours to guess at.
 */
function extractJpegs(buffer) {
  const text = ascii(buffer);
  const images = [];
  let cursor = 0;

  while (true) {
    const dct = text.indexOf("/DCTDecode", cursor);
    if (dct === -1) break;

    // The dictionary ends at the `stream` keyword that follows it.
    const streamAt = text.indexOf("stream", dct);
    if (streamAt === -1) break;

    // Skip the EOL after `stream` (CRLF or LF — both are legal).
    let start = streamAt + "stream".length;
    if (buffer[start] === 0x0d) start++;
    if (buffer[start] === 0x0a) start++;

    const endAt = text.indexOf("endstream", start);
    if (endAt === -1) break;

    // Prefer the declared /Length; fall back to the endstream position, which
    // can include the trailing EOL the writer added.
    const dict = text.slice(dct - 400 > 0 ? dct - 400 : 0, streamAt);
    const declared = /\/Length\s+(\d+)/.exec(dict);
    let end = declared ? start + Number(declared[1]) : endAt;
    if (end > endAt || end <= start) end = endAt;

    let bytes = buffer.subarray(start, end);
    // Trim any EOL the writer put before `endstream`.
    while (bytes.length && (bytes[bytes.length - 1] === 0x0a || bytes[bytes.length - 1] === 0x0d)) {
      bytes = bytes.subarray(0, bytes.length - 1);
    }

    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      images.push({ bytes, size: jpegSize(bytes) });
    }
    cursor = endAt + "endstream".length;
  }

  return images;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

const { data: registrations, error } = await supabase
  .from("registrations")
  .select(
    `id, academy_name, created_at, receipt_pdf_url,
     players ( full_name, photo_url, jersey_number )`,
  )
  .order("created_at", { ascending: true });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

/** Registrations where more than one player shares a photo URL. */
function isDamaged(reg) {
  const urls = (reg.players ?? []).map((p) => p.photo_url).filter(Boolean);
  return new Set(urls).size < urls.length;
}

const targets = registrations.filter((reg) =>
  filter
    ? reg.id === filter ||
      reg.academy_name?.toLowerCase().includes(filter.toLowerCase())
    : isDamaged(reg),
);

if (targets.length === 0) {
  console.log(
    filter
      ? `No registration matched "${filter}".`
      : "No registration has players sharing a photo. Nothing to extract.",
  );
  process.exit(0);
}

const slug = (value) =>
  (value || "team").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

for (const reg of targets) {
  const when = new Date(reg.created_at).toISOString().slice(0, 10);
  console.log(`\n${reg.academy_name}  (${when})  ${reg.id}`);

  // The roster PDF lives in a PUBLIC bucket, but download it through the client
  // rather than by URL so this works the same if that ever changes.
  const { data: blob, error: dlError } = await supabase.storage
    .from("registration-receipts")
    .download(`${reg.id}/summary.pdf`);

  if (dlError) {
    console.log(`  no roster PDF: ${dlError.message}`);
    continue;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const images = extractJpegs(buffer);
  console.log(`  PDF ${(buffer.length / 1024).toFixed(0)}KB -> ${images.length} embedded image(s)`);

  if (images.length === 0) continue;

  const dir = path.join(OUT_ROOT, `${slug(reg.academy_name)}-${reg.id.slice(0, 8)}`);
  await mkdir(dir, { recursive: true });

  // Draw order in generateReceipt.ts: team logo (90px), coach headshot (90px),
  // then one 44px thumbnail per roster row in table order. A team with no logo
  // or no coach photo simply has fewer leading images, so the labels below are a
  // best guess from position — the pixel size is the reliable tell (90 vs 44).
  const players = reg.players ?? [];
  let playerCursor = 0;

  for (let i = 0; i < images.length; i++) {
    const { bytes, size } = images[i];
    const dim = size ? `${size.width}x${size.height}` : "unknown";
    let label;

    if (size && size.width >= 60) {
      label = i === 0 ? "logo" : "coach-or-official";
    } else {
      const player = players[playerCursor];
      label = `player-${String(playerCursor + 1).padStart(2, "0")}-${slug(
        player?.full_name,
      )}`;
      playerCursor++;
    }

    const file = path.join(dir, `${String(i + 1).padStart(2, "0")}-${label}-${dim}.jpg`);
    await writeFile(file, bytes);
    console.log(`    ${dim.padEnd(9)} ${(bytes.length / 1024).toFixed(1).padStart(6)}KB  ${file}`);
  }
}

console.log(
  `\nDone. Check the pixel sizes above before using these.\n` +
    `generateReceipt.ts re-encodes player photos through a 44x44 canvas, so a\n` +
    `44x44 output is all the PDF ever held — it is not a cropping artefact and\n` +
    `there is no larger copy inside the file to recover.`,
);
