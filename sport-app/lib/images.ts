/**
 * Client-side image downscaling + JPEG re-encoding.
 *
 * WHY THIS EXISTS: two separate constraints meet here.
 *
 * 1. A stock phone camera photo is 3-8MB. Supabase storage rejects anything over
 *    the bucket's per-object limit, so without this step a perfectly normal
 *    upload fails — after the user has already filled in the whole form.
 *
 * 2. The free tier gives 1GB of storage total, and the event is sized for ~200
 *    teams x 18 players. That is 3,600 player photos + 3,600 proof-of-age
 *    documents + logos, so the per-file budget is genuinely tight:
 *
 *        38 files/team x 120KB = 4.4MB/team worst case
 *        200 teams              = ~890MB  (fits, at the cap)
 *
 *    In practice compression lands well under the cap (~75KB photos, ~105KB
 *    documents), which brings 200 teams to roughly 660MB and leaves real
 *    headroom. The cap is the ceiling; these targets are what actually decides
 *    the total.
 *
 * Everything here degrades gracefully: if a file can't be decoded (HEIC on a
 * browser without support, a corrupt image, a PDF) the ORIGINAL file is
 * returned untouched and the normal size validation reports the problem.
 */

/**
 * Hard per-file ceiling, enforced by validateFile in lib/api/registration.ts.
 * Keep the storage buckets' own per-object limit at or ABOVE this number: the
 * app should be the thing that rejects an oversized file, because it can explain
 * why, whereas storage returns a raw API error.
 */
export const MAX_UPLOAD_BYTES = 120 * 1024;

/**
 * What compression aims for — deliberately under MAX_UPLOAD_BYTES so an encode
 * that lands a few hundred bytes over target still clears validation.
 */
export const TARGET_MAX_BYTES = 110 * 1024;

/**
 * Long-edge cap for a person/logo photo. The largest place a photo is displayed
 * is a 128px preview well and a 90px thumbnail in the roster PDF, so 720px is
 * already generous — it exists so a zoomed-in face still looks sharp.
 */
export const PHOTO_MAX_EDGE = 720;

/**
 * Long-edge cap for a scanned document (birth certificate, ID card). Larger than
 * a portrait because small print has to stay legible when zoomed: 1400px across
 * an A4 page is ~145 DPI, which reads fine for names and dates.
 */
export const DOCUMENT_MAX_EDGE = 1400;

/**
 * Don't shrink below this on the long edge. Past here the image stops being
 * useful as evidence, so we accept being over budget rather than destroy it —
 * validateFile then reports it and the registrant can supply a better source.
 */
const MIN_EDGE = 320;

/** Encode attempts before giving up. Generous: the loop is cheap and bounded. */
const MAX_ATTEMPTS = 12;

export interface CompressOptions {
  /** Max width/height in px; aspect ratio is always preserved. */
  maxEdge: number;
  /** Starting JPEG quality (0-1). Reduced automatically if still too large. */
  quality?: number;
  /**
   * Floor for the quality ramp. Once here, further shrinking happens by
   * dimension instead — for text, losing pixels beats heavy ringing artifacts,
   * so documents set this lower than photos to hold resolution longer.
   */
  minQuality?: number;
  /** Shrink further until the result fits under this many bytes. */
  maxBytes?: number;
}

function isCompressibleImage(file: File): boolean {
  // Only bitmap formats. PDFs can't be re-encoded in a canvas, and SVG is
  // already tiny (and rasterising it would lose the point).
  return /^image\/(jpeg|jpg|png|webp|heic|heif|bmp|gif)$/i.test(file.type);
}

/**
 * Decode a File into something drawable. `createImageBitmap` is preferred
 * because `imageOrientation: "from-image"` bakes in EXIF rotation — without it,
 * photos taken in portrait on a phone come out sideways.
 */
async function decode(
  file: File,
): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path (older Safari, unsupported codec).
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
}

/** Swap whatever extension a file has for .jpg, since we always emit JPEG. */
function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}.jpg`;
}

/**
 * Downscale + JPEG-compress an image File, returning a NEW File.
 *
 * Returns the input unchanged when it isn't a compressible bitmap or can't be
 * decoded — callers must therefore still validate size afterwards.
 */
export async function compressImageFile(
  file: File,
  {
    maxEdge,
    quality = 0.85,
    minQuality = 0.55,
    maxBytes = TARGET_MAX_BYTES,
  }: CompressOptions,
): Promise<File> {
  if (!isCompressibleImage(file)) return file;

  const source = await decode(file);
  if (!source) return file;

  const srcW = source.width;
  const srcH = source.height;
  if (!srcW || !srcH) return file;

  try {
    // Never upscale: a 400px photo stays 400px.
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    let width = Math.max(1, Math.round(srcW * scale));
    let height = Math.max(1, Math.round(srcH * scale));

    let currentQuality = quality;
    let best: Blob | null = null;

    // Drive the encode down under `maxBytes`: quality first (cheap, barely
    // visible), then dimensions once quality is as low as is tolerable. The
    // MIN_EDGE floor makes this terminate rather than shrink toward 1px — with a
    // budget this small, a loop that merely *usually* converges would dead-end
    // the occasional registrant at the final submit.
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      // White backdrop so transparent PNGs don't flatten to black in JPEG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);

      const blob = await toBlob(canvas, currentQuality);
      if (!blob) return file;
      best = blob;

      if (blob.size <= maxBytes) break;

      if (currentQuality > minQuality) {
        currentQuality = Math.max(minQuality, currentQuality - 0.1);
      } else if (Math.max(width, height) > MIN_EDGE) {
        width = Math.max(1, Math.round(width * 0.75));
        height = Math.max(1, Math.round(height * 0.75));
      } else {
        // Already at the floor on both axes — shrinking further would make the
        // document unreadable, which defeats the point of collecting it.
        break;
      }
    }

    if (!best) return file;

    // If compression made things worse (an already-optimised small JPEG), keep
    // the original — but only when the original itself fits. Otherwise the
    // smaller of the two is still the better shot at clearing the cap.
    if (best.size >= file.size && file.size <= maxBytes) return file;

    return new File([best], jpegName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    // ImageBitmap holds decoded pixels off-heap; release it explicitly.
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      source.close();
    }
  }
}

/** Convenience wrapper for person/team photos (player, coach, logo). */
export function compressPhoto(file: File): Promise<File> {
  return compressImageFile(file, {
    maxEdge: PHOTO_MAX_EDGE,
    quality: 0.82,
    minQuality: 0.6,
  });
}

/** Convenience wrapper for scanned documents (proof of age). */
export function compressDocumentImage(file: File): Promise<File> {
  return compressImageFile(file, {
    maxEdge: DOCUMENT_MAX_EDGE,
    quality: 0.75,
    // Lower floor than photos: for printed text, holding resolution matters more
    // than avoiding JPEG artifacts, so ramp quality down before losing pixels.
    minQuality: 0.5,
  });
}

/** Human-readable KB, for size labels in the UI. */
export function kb(bytes: number): number {
  return Math.max(1, Math.round(bytes / 1024));
}
