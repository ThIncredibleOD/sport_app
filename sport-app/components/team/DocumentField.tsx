"use client";

import { useRef, useState } from "react";
import { Check, Eye, FileText, Loader2, Upload } from "lucide-react";
import { compressDocumentImage } from "@/lib/images";

/**
 * A player's proof-of-age document: view it, or replace it.
 *
 * VIEWING goes through /api/team/document-url, which takes a player id — never
 * a path — and looks the path up scoped to the team's own registration. The
 * URL it returns lasts 60 seconds. This bucket holds minors' identity
 * documents and is private; that route is the only way a team can read from it.
 *
 * REPLACING is queued for the organiser, because this document is the evidence
 * the age limit rests on. As everywhere else in this portal, that is invisible:
 * the upload reports success (it succeeded — the file is stored), and the page
 * keeps showing a document on file. Do not add a "pending review" state here.
 */
type Props = {
  playerId: string;
  playerName: string;
  hasDocument: boolean;
  onUploaded: () => void;
};

export default function DocumentField({
  playerId,
  playerName,
  hasDocument,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  async function view() {
    setOpening(true);
    setError("");

    try {
      const res = await fetch("/api/team/document-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That document couldn't be opened.");
        setOpening(false);
        return;
      }

      // noopener so the opened tab can't reach back into this one via
      // window.opener — it is a signed URL to a private document.
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      setOpening(false);
    } catch {
      setError("Network error. Please try again.");
      setOpening(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;

    setBusy(true);
    setError("");

    try {
      // PDFs are passed through untouched — they can't be re-encoded in a
      // canvas. An oversized one is refused by the server with a message
      // telling the team to photograph the document instead.
      let file = picked;
      if (picked.type !== "application/pdf") {
        try {
          file = await compressDocumentImage(picked);
        } catch {
          file = picked;
        }
      }

      const form = new FormData();
      form.append("file", file);
      form.append("kind", "proof-of-age");
      form.append("playerId", playerId);

      const res = await fetch("/api/team/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That document couldn't be uploaded.");
        setBusy(false);
        return;
      }

      onUploaded();
      setBusy(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
        Proof of age
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
          <FileText className="h-3.5 w-3.5 text-slate-500" />
          {hasDocument ? "On file" : "Not uploaded"}
        </span>

        {hasDocument && (
          <button
            type="button"
            onClick={view}
            disabled={opening}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-slate-950/50 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {opening ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            View
          </button>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-slate-950/50 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          {hasDocument ? "Replace" : "Upload"}
        </button>

        {justSaved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#16a34a]">
            <Check className="h-3 w-3" />
            Uploaded
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFile}
        className="hidden"
        disabled={busy}
        aria-label={`Proof of age for ${playerName}`}
      />

      {error && <p className="text-[10px] text-amber-400">{error}</p>}
    </div>
  );
}
