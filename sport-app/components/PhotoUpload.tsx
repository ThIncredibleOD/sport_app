"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, RefreshCw, Upload, Loader2 } from "lucide-react";
import { compressPhoto, kb } from "@/lib/images";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
  /** Button text when nothing has been chosen yet, e.g. "Upload Passport". */
  label: string;
  /** Circle suits a person's headshot; square suits a team logo. */
  shape?: "square" | "circle";
  disabled?: boolean;
};

/** Derive a temporary object URL for a File, cleaning it up on change/unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // Syncing an external browser resource (the object URL) into state — the
    // "update from an external system" case this rule explicitly allows.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return file ? url : null;
}

/**
 * Image input: pick a file, see a preview.
 *
 * Deliberately a plain file picker — no live webcam capture, and no `capture`
 * attribute either, since that hijacks a phone straight into the camera app and
 * blocks choosing an existing photo. People arrive with images already on their
 * device; taking one on the spot is not part of the flow.
 *
 * Whatever is picked is compressed to a JPEG `File` before it reaches
 * `onChange`, so callers store it exactly as they would a raw file-picked image
 * and the upload pipeline needs no special cases.
 *
 * Photos are OPTIONAL by design: an empty value must never block a submission.
 */
export default function PhotoUpload({
  value,
  onChange,
  label,
  shape = "square",
  disabled = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useObjectUrl(value);
  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so re-picking the same filename still fires a change event.
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      onChange(await compressPhoto(file));
    } catch {
      // Compression is best-effort — an undecodable file still goes through and
      // gets caught by size/type validation at submit with a clear message.
      onChange(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Preview well */}
      <div
        className={`flex h-32 w-32 items-center justify-center overflow-hidden border border-white/20 bg-slate-950/60 ${rounded}`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus className="h-7 w-7 text-slate-600" />
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-slate-950/60 py-1.5 px-3 text-[11px] font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
      >
        {value ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {value ? "Change file" : label}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        disabled={disabled || busy}
      />

      {value && !busy && (
        <p className="inline-flex items-center gap-1 text-[10px] text-[#16a34a]">
          <Check className="h-3 w-3" />
          Photo ready ({kb(value.size)}KB)
        </p>
      )}

      {error && (
        <p className="max-w-[13rem] text-center text-[10px] text-amber-400">
          {error}
        </p>
      )}
    </div>
  );
}
