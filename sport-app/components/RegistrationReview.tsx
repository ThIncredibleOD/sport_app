"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Phone,
  Mail,
  User,
  Users,
  Calendar,
  Flag,
  Shirt,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useRegister, playerBlockingGaps, officialBlockingGaps } from "@/context/sportContext";

type Props = {
  /** Tournament logo shown in the header, e.g. "/under1.png". */
  logoSrc: string;
  logoAlt: string;
  /** Human-readable tournament name. */
  tournamentName: string;
  /** Where "Go Back to Edit" returns to (the players carousel). */
  editRoute: string;
  /** Where "Continue to Submit" advances to (must stay inside this flow's provider). */
  submitRoute: string;
};

/** Small helper: derive a temporary object URL for a File, cleaning it up on change/unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // Syncing an external browser resource (the object URL) into state — the
    // "update from an external system" case this rule explicitly allows, but
    // its heuristic can't tell createObjectURL is external. Correct as written.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  // Derive the empty case instead of a second setState — when there's no file
  // there can be no URL, regardless of the last value we held.
  return file ? url : null;
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#16a34a]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-xs text-white break-words">
          {value && value.trim() ? value : "—"}
        </p>
      </div>
    </div>
  );
}

/**
 * One official's card: photo well plus name / date of birth / nationality.
 *
 * A component rather than a render function because it calls useObjectUrl, and a
 * hook can't be called from inside a loop. Making it a component gives each
 * official its own hook instance, so all five (head coach + four others) render
 * through identical markup.
 */
function StaffCard({
  heading,
  fullName,
  dateOfBirth,
  nationality,
  passport,
  gaps,
}: {
  heading: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  passport: File | null;
  gaps: string[];
}) {
  const photoUrl = useObjectUrl(passport);

  return (
    <div
      className={`rounded-lg border p-3 ${
        gaps.length > 0
          ? "border-amber-500/40 bg-amber-950/10"
          : "border-white/15 bg-slate-950/50"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#16a34a] mb-2">
        {heading}
      </p>
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-slate-950/60">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={`${heading} passport`}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-slate-500" />
          )}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2">
          <Detail icon={User} label="Full Name" value={fullName} />
          <Detail icon={Calendar} label="Date of Birth" value={dateOfBirth} />
          <Detail icon={Flag} label="Nationality" value={nationality} />
        </div>
      </div>
      {gaps.length > 0 && (
        <p className="mt-2 flex items-start gap-1 text-[10px] text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
          <span>Missing: {gaps.join(", ")}</span>
        </p>
      )}
    </div>
  );
}

export default function RegistrationReview({
  logoSrc,
  logoAlt,
  tournamentName,
  editRoute,
  submitRoute,
}: Props) {
  const {
    academyProfile,
    headCoach,
    teamManager,
    assistantCoach,
    medics,
    players,
  } = useRegister();
  const router = useRouter();

  const logoUrl = useObjectUrl(academyProfile.logo);
  const coachUrl = useObjectUrl(headCoach.passport);

  const filledCount = players.filter((p) => p.fullName.trim()).length;

  // Per-player blocking gaps (keyed by player id) — mirrors submitRegistration's
  // hard requirements so an incomplete team can't reach the submit step and fail
  // partway through the upload.
  const playerGaps = new Map(
    players.map((p) => [p.id, playerBlockingGaps(p)]),
  );
  const playersWithGaps = players.filter(
    (p) => (playerGaps.get(p.id) ?? []).length > 0,
  ).length;

  // The four officials besides the head coach, in the order they were entered.
  // Each is optional: an un-named one is simply not listed, and reports no gaps.
  const officials = [
    { heading: "Team Manager", person: teamManager },
    { heading: "Assistant Coach", person: assistantCoach },
    ...medics.map((medic, index) => ({
      heading: `Medic ${index + 1}`,
      person: medic,
    })),
  ].map((entry) => ({
    ...entry,
    gaps: officialBlockingGaps(entry.person),
  }));
  const namedOfficials = officials.filter((o) => o.person.fullName.trim());
  const officialsWithGaps = officials.filter((o) => o.gaps.length > 0).length;

  // Registration-level blockers.
  const academyGaps: string[] = [];
  if (!academyProfile.academyName.trim()) academyGaps.push("academy name");
  if (!academyProfile.name.trim()) academyGaps.push("contact name");
  if (!academyProfile.contactNumber.trim()) academyGaps.push("contact number");
  if (!academyProfile.email.trim()) academyGaps.push("email");
  if (!headCoach.fullName.trim()) academyGaps.push("head coach name");
  // coach_dob is a NOT NULL `date` column, so an empty one fails the insert with
  // a raw Postgres type error. Catch it here where it can still be fixed.
  if (!headCoach.dateOfBirth.trim())
    academyGaps.push("head coach date of birth");
  if (!headCoach.nationality.trim()) academyGaps.push("head coach nationality");

  const hasNoPlayers = filledCount === 0;
  const canProceed =
    !hasNoPlayers &&
    playersWithGaps === 0 &&
    officialsWithGaps === 0 &&
    academyGaps.length === 0;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white">
        {/* Top Back Link */}
        <div className="w-full flex justify-start mb-2">
          <button
            type="button"
            onClick={() => router.push(editRoute)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Players</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={logoAlt}
            className="h-20 w-auto object-contain"
          />
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white uppercase">
            Review Your Registration
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-md leading-relaxed">
            {tournamentName}. Please confirm every detail below is correct.{" "}
            <span className="text-amber-400">
              Once you submit, you can&apos;t change it yourself.
            </span>
          </p>
        </div>

        {/* Academy Profile */}
        <section className="mt-6 rounded-xl border border-white/15 bg-slate-950/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Building2 className="h-4 w-4 text-[#16a34a]" />
            Academy Profile
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-slate-950/60">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Team logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-slate-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-400">Team Logo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <Detail icon={Building2} label="Academy Name" value={academyProfile.academyName} />
              <Detail icon={User} label="Contact Name" value={academyProfile.name} />
              <Detail icon={Phone} label="Contact Number" value={academyProfile.contactNumber} />
              <Detail icon={Mail} label="Email" value={academyProfile.email} />
            </div>
          </div>
        </section>

        {/* Head Coach */}
        <section className="mt-4 rounded-xl border border-white/15 bg-slate-950/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <User className="h-4 w-4 text-[#16a34a]" />
            Head Coach
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-slate-950/60">
                {coachUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coachUrl}
                    alt="Coach passport"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-slate-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-400">Passport</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <Detail icon={User} label="Full Name" value={headCoach.fullName} />
              <Detail icon={Calendar} label="Date of Birth" value={headCoach.dateOfBirth} />
              <Detail icon={Flag} label="Nationality" value={headCoach.nationality} />
            </div>
          </div>
        </section>

        {/* Team Officials — everyone besides the head coach. All optional, so
            only the ones actually entered are listed. */}
        <section className="mt-4 rounded-xl border border-white/15 bg-slate-950/40 p-4">
          <h2 className="flex items-center justify-between text-sm font-semibold text-white mb-3">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#16a34a]" />
              Team Officials
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {namedOfficials.length} of {officials.length} entered
            </span>
          </h2>

          {namedOfficials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {namedOfficials.map((official) => (
                <StaffCard
                  key={official.heading}
                  heading={official.heading}
                  fullName={official.person.fullName}
                  dateOfBirth={official.person.dateOfBirth}
                  nationality={official.person.nationality}
                  passport={official.person.passport}
                  gaps={official.gaps}
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              No team manager, assistant coach or medics entered. That&apos;s
              fine — they&apos;re optional.
            </p>
          )}
        </section>

        {/* Players */}
        <section className="mt-4 rounded-xl border border-white/15 bg-slate-950/40 p-4">
          <h2 className="flex items-center justify-between text-sm font-semibold text-white mb-3">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#16a34a]" />
              Players
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {filledCount} of {players.length} entered
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map((player, index) => {
              const isFilled = player.fullName.trim().length > 0;
              const gaps = playerGaps.get(player.id) ?? [];
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    isFilled
                      ? gaps.length > 0
                        ? "border-amber-500/40 bg-amber-950/10"
                        : "border-white/15 bg-slate-950/50"
                      : "border-dashed border-white/10 bg-slate-950/20"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-slate-950/60">
                    {player.passportPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.passportPreview}
                        alt={`Player ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-slate-600" />
                    )}
                  </div>

                  {isFilled ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {player.fullName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Shirt className="h-3 w-3" />
                          {player.jerseyNumber || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {player.position || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          {player.nationality || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {player.dateOfBirth || "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            player.proofOfAge ? "text-[#16a34a]" : "text-amber-400"
                          }`}
                        >
                          <FileText className="h-3 w-3" />
                          Age proof
                        </span>
                      </div>
                      {gaps.length > 0 && (
                        <p className="mt-1 flex items-start gap-1 text-[10px] text-amber-400">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
                          <span>Missing: {gaps.join(", ")}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">
                        Player {index + 1}
                      </p>
                      <p className="text-[10px] text-slate-600">Not entered</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Notice */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Nothing is submitted yet. Your details are saved on this device only
            — they are sent on the next step.
          </span>
        </div>

        {/* Blocking summary. submitRegistration requires a proof-of-age file per
            player, so an incomplete team has to be caught here rather than
            failing partway through the upload and leaving a half-written row. */}
        {!canProceed && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/25 p-3 text-[11px] text-amber-100">
            <p className="flex items-center gap-1.5 font-semibold text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Complete these before submitting
            </p>
            <ul className="mt-1.5 ml-5 list-disc space-y-0.5 text-amber-200/90">
              {hasNoPlayers && <li>Add at least one player.</li>}
              {academyGaps.length > 0 && (
                <li>Academy details missing: {academyGaps.join(", ")}.</li>
              )}
              {playersWithGaps > 0 && (
                <li>
                  {playersWithGaps} player{playersWithGaps === 1 ? "" : "s"} still
                  missing required details or proof of age (see the amber rows
                  above).
                </li>
              )}
              {officialsWithGaps > 0 && (
                <li>
                  {officialsWithGaps} team official
                  {officialsWithGaps === 1 ? "" : "s"} named but missing a date of
                  birth or nationality. Fill those in, or clear the name to leave
                  the role out.
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => router.push(editRoute)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-slate-950/60 py-2.5 px-4 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back to Edit</span>
          </button>
          <button
            type="button"
            onClick={() => canProceed && router.push(submitRoute)}
            disabled={!canProceed}
            title={
              canProceed
                ? undefined
                : "Complete all required details and proof of age first"
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 px-4 text-xs font-semibold transition-all ${
              canProceed
                ? "bg-[#16a34a] text-white hover:bg-[#15803d] shadow-lg shadow-emerald-950/50"
                : "cursor-not-allowed bg-slate-800 text-slate-500 border border-white/10"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Continue to Submit</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
