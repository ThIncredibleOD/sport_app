"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Plus, Upload, UserPlus, X } from "lucide-react";
import { compressDocumentImage, compressPhoto } from "@/lib/images";
import {
  PREFERRED_FOOT_OPTIONS,
  cmToFeetInches,
} from "@/lib/height";

/**
 * Add a player to a squad that isn't full yet.
 *
 * WHAT IS REQUIRED HERE IS NOT A NEW RULE. It is the same set the registration
 * form enforces (`playerBlockingGaps`, context/sportContext.tsx): name, date of
 * birth, nationality, jersey number, position and proof of age. A photo is
 * optional there and optional here, so a team can add a player now and attach
 * the photo afterwards through the card's own photo control.
 *
 * PROOF OF AGE IS THE ONE FILE THAT IS REQUIRED. A player added through this
 * form goes onto the roster immediately, so the document the age limit rests on
 * has to arrive with them — see the header of /api/team/add-player.
 *
 * Height and preferred foot show ONLY for the Unity Cup, which is the only
 * tournament that collects them at registration.
 */

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

/** The shape /api/team/add-player returns, matching the portal's Player. */
export type AddedPlayer = {
  id: string;
  full_name: string;
  dob: string;
  nationality: string;
  jersey_number: string | null;
  position: string | null;
  height_cm: string | null;
  preferred_foot: string | null;
  photo_url: string | null;
  has_proof_of_age: boolean;
  created_at: string;
};

type Props = {
  /** Shown so the team knows how much room is left. */
  remaining: number;
  /** Height and preferred foot are Unity-only. */
  showHeightAndFoot: boolean;
  onAdded: (player: AddedPlayer) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-600 transition focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-60";

const labelClass =
  "block text-[11px] font-medium tracking-wide text-slate-500 uppercase mb-1";

export default function AddPlayerForm({
  remaining,
  showHeightAndFoot,
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const proofRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setFullName("");
    setDob("");
    setNationality("");
    setJersey("");
    setPosition("");
    setHeightCm("");
    setPreferredFoot("");
    setPhoto(null);
    setProof(null);
    setError("");
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function submit() {
    setError("");

    // Checked here so the team gets the answer immediately, and again on the
    // server, which is where it actually counts.
    if (fullName.trim().length < 2) {
      setError("Please enter the player's full name.");
      return;
    }
    if (!dob) {
      setError("Please enter the player's date of birth.");
      return;
    }
    if (!nationality.trim()) {
      setError("Please enter the player's nationality.");
      return;
    }
    if (!/^\d{1,3}$/.test(jersey.trim())) {
      setError("Please enter a jersey number of up to three digits.");
      return;
    }
    if (!position) {
      setError("Please choose the player's position.");
      return;
    }
    if (!proof) {
      setError("Please attach proof of age. A player can't be added without one.");
      return;
    }

    setSaving(true);

    try {
      const form = new FormData();
      form.append("full_name", fullName.trim());
      form.append("dob", dob);
      form.append("nationality", nationality.trim());
      form.append("jersey_number", jersey.trim());
      form.append("position", position);
      if (showHeightAndFoot) {
        form.append("height_cm", heightCm.trim());
        form.append("preferred_foot", preferredFoot);
      }

      // PDFs are passed through untouched — they can't be re-encoded in a
      // canvas. Same handling as DocumentField.
      let proofFile = proof;
      if (proof.type !== "application/pdf") {
        try {
          proofFile = await compressDocumentImage(proof);
        } catch {
          proofFile = proof;
        }
      }
      form.append("proof_of_age", proofFile);

      if (photo) {
        let photoFile = photo;
        try {
          photoFile = await compressPhoto(photo);
        } catch {
          photoFile = photo;
        }
        form.append("photo", photoFile);
      }

      const res = await fetch("/api/team/add-player", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That player couldn't be added.");
        setSaving(false);
        return;
      }

      onAdded(data.player);
      setSaving(false);
      close();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:border-white/30 hover:text-white"
      >
        <UserPlus className="h-4 w-4" />
        Add a player
        <span className="text-xs text-slate-500">
          {remaining} {remaining === 1 ? "space" : "spaces"} left
        </span>
      </button>
    );
  }

  const feetInches = cmToFeetInches(heightCm);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Add a player</h3>
        <button
          type="button"
          onClick={close}
          disabled={saving}
          aria-label="Cancel adding a player"
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:text-white disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="add-player-name">
            Full name
          </label>
          <input
            id="add-player-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={200}
            disabled={saving}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="add-player-dob">
            Date of birth
          </label>
          <input
            id="add-player-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={saving}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="add-player-nationality">
            Nationality
          </label>
          <input
            id="add-player-nationality"
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            maxLength={200}
            disabled={saving}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="add-player-jersey">
            Jersey number
          </label>
          <input
            id="add-player-jersey"
            type="text"
            inputMode="numeric"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            maxLength={3}
            disabled={saving}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="add-player-position">
            Position
          </label>
          <select
            id="add-player-position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select player position</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {showHeightAndFoot && (
          <>
            <div>
              <label className={labelClass} htmlFor="add-player-height">
                Height (cm)
              </label>
              <input
                id="add-player-height"
                type="text"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                maxLength={3}
                placeholder="Optional"
                disabled={saving}
                className={inputClass}
              />
              {/* Derived for reassurance while typing, never stored. */}
              {feetInches && (
                <p className="mt-1 text-[10px] text-slate-500">{feetInches}</p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="add-player-foot">
                Preferred foot
              </label>
              <select
                id="add-player-foot"
                value={preferredFoot}
                onChange={(e) => setPreferredFoot(e.target.value)}
                disabled={saving}
                className={inputClass}
              >
                <option value="">Not set</option>
                {PREFERRED_FOOT_OPTIONS.map((foot) => (
                  <option key={foot} value={foot}>
                    {foot}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ------------------------------ Files ----------------------------- */}
        <div>
          <p className={labelClass}>Photo (optional)</p>
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {photo ? (
              <Check className="h-3.5 w-3.5 text-[#16a34a]" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="truncate">{photo ? photo.name : "Choose a photo"}</span>
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              setPhoto(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="hidden"
            disabled={saving}
            aria-label="Player photo"
          />
        </div>

        <div>
          <p className={labelClass}>Proof of age</p>
          <button
            type="button"
            onClick={() => proofRef.current?.click()}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {proof ? (
              <Check className="h-3.5 w-3.5 text-[#16a34a]" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="truncate">{proof ? proof.name : "Choose a file"}</span>
          </button>
          <input
            ref={proofRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              setProof(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="hidden"
            disabled={saving}
            aria-label="Proof of age"
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Proof of age is required — a birth certificate, passport or school record
        showing the player&apos;s date of birth. Images and PDFs are both fine.
      </p>

      {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {saving ? "Adding..." : "Add player"}
        </button>
      </div>
    </div>
  );
}
