"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { compressPhoto } from "@/lib/images";

/**
 * A photo the team can replace, applied immediately.
 *
 * Photos are the one thing this portal changes without the organiser seeing it
 * first. A wrong photo is an inconvenience rather than an integrity problem —
 * unlike a date of birth, it isn't what age eligibility rests on — and fixing
 * one without waiting is most of the reason teams asked for this.
 *
 * The file is compressed here, before it is sent, by the same `compressPhoto`
 * the registration form uses. That keeps it inside the 120KB cap the server
 * enforces, so a phone photo straight off a camera roll works. The server
 * re-checks size and type regardless, because a route handler can't assume its
 * caller was this component.
 */
type Props = {
  label: string;
  /** Current public URL, or "" / null when there isn't one. */
  url: string | null;
  kind: "player-photo" | "official-photo" | "team-logo";
  playerId?: string;
  official?: string;
  shape?: "circle" | "square";
  size?: "sm" | "md";
  onUploaded: (url: string) => void;
};

export default function PhotoField({
  label,
  url,
  kind,
  playerId,
  official,
  shape = "circle",
  size = "md",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";
  const box = size === "sm" ? "h-16 w-16" : "h-24 w-24";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    // Reset so re-picking the same filename still fires a change event.
    e.target.value = "";
    if (!picked) return;

    setBusy(true);
    setError("");

    try {
      // Best-effort: an undecodable file goes through uncompressed and is
      // caught by the server's size/type check with a clear message.
      let file = picked;
      try {
        file = await compressPhoto(picked);
      } catch {
        file = picked;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      if (playerId) form.append("playerId", playerId);
      if (official) form.append("official", official);

      const res = await fetch("/api/team/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That photo couldn't be uploaded.");
        setBusy(false);
        return;
      }

      onUploaded(data.url);
      setBusy(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center overflow-hidden border border-white/20 bg-slate-950/60 ${box} ${rounded}`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus className="h-6 w-6 text-slate-600" />
        )}
      </div>

      <p className="text-center text-[10px] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-slate-950/60 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:text-white disabled:opacity-50"
      >
        <RefreshCw className="h-3 w-3" />
        {url ? "Replace" : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        // No `capture` attribute: it hijacks a phone straight into the camera
        // app and blocks choosing an existing photo, which is the whole point
        // here — the right picture is already on their device.
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        disabled={busy}
      />

      {justSaved && (
        <p className="inline-flex items-center gap-1 text-[10px] text-[#16a34a]">
          <Check className="h-3 w-3" />
          Updated
        </p>
      )}

      {error && (
        <p className="max-w-[10rem] text-center text-[10px] text-amber-400">
          {error}
        </p>
      )}
    </div>
  );
}
