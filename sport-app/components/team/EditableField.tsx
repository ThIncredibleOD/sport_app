"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";

/**
 * One editable value in the team portal.
 *
 * THE TWO MODES MUST LOOK IDENTICAL. `mode` decides only which endpoint is
 * called: "instant" writes the value straight to the row, "review" queues it
 * for the organiser. Everything a team can see — the input, the buttons, the
 * wording, the timing, the tick at the end — is the same either way, and the
 * value they typed is what the page shows afterwards in both cases.
 *
 * That is deliberate and it is the point of the feature. Identity fields are
 * checked because this is an age-restricted tournament and a silently edited
 * date of birth would void the eligibility check. A team that could tell which
 * fields are checked would know exactly which ones aren't.
 *
 * So: do not add a "pending" badge, a different button colour, a slower
 * spinner, or a distinct success message to the review path.
 */
export type FieldMode = "instant" | "review";

type Props = {
  label: string;
  value: string;
  field: string;
  mode: FieldMode;
  playerId?: string;
  /** Input type — "date" for dates, "tel" for phones, else text. */
  type?: "text" | "date" | "tel" | "email";
  placeholder?: string;
  maxLength?: number;
  /** Called with the saved value so the parent can update its own copy. */
  onSaved: (value: string) => void;
  /** Compact layout for the dense player rows. */
  compact?: boolean;
};

export default function EditableField({
  label,
  value,
  field,
  mode,
  playerId,
  type = "text",
  placeholder,
  maxLength = 200,
  onSaved,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  function startEditing() {
    setDraft(value);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setError("");
    setEditing(false);
  }

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");

    // The ONLY difference between the two modes.
    const endpoint =
      mode === "instant" ? "/api/team/update" : "/api/team/request-change";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          value: draft,
          ...(playerId ? { playerId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That couldn't be saved. Please try again.");
        setSaving(false);
        return;
      }

      onSaved(data.value ?? draft);
      setEditing(false);
      setSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  }

  const displayValue = value || "—";

  if (!editing) {
    return (
      <div
        className={
          compact
            ? "flex items-center justify-between gap-2"
            : "flex items-start justify-between gap-3 border-b border-white/5 py-3 last:border-0"
        }
      >
        <div className="min-w-0 flex-1">
          <p
            className={
              compact
                ? "text-[10px] font-medium tracking-wide text-slate-500 uppercase"
                : "text-[11px] font-medium tracking-wide text-slate-500 uppercase"
            }
          >
            {label}
          </p>
          <p
            className={`truncate text-white ${compact ? "text-xs" : "text-sm"} ${
              value ? "" : "text-slate-600"
            }`}
          >
            {displayValue}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#16a34a]">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit ${label}`}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-slate-950/50 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:border-white/30 hover:text-white"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "space-y-1.5"
          : "space-y-2 border-b border-white/5 py-3 last:border-0"
      }
    >
      <label className="block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </label>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={saving}
        autoFocus
        className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-600 transition focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-60"
      />

      {error && <p className="text-[11px] text-amber-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:text-white disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
