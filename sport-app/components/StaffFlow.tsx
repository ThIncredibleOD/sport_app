"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRegister, type Official } from "@/context/sportContext";
import PhotoUpload from "@/components/PhotoUpload";

export type StaffRole = "team-manager" | "assistant-coach" | "medics";

type Props = {
  /** Which official(s) this page captures. "medics" renders two blocks. */
  role: StaffRole;
  /** Tournament logo shown in the header, e.g. "/under1.png". */
  logoSrc: string;
  logoAlt: string;
  /** Where the Back links return to (must stay inside this flow's provider). */
  backRoute: string;
  /** Where the forward button advances to. */
  nextRoute: string;
  /** Label on the forward button, e.g. "Continue to Head Coach". */
  nextLabel: string;
};

const COPY: Record<StaffRole, { title: string; blurb: string }> = {
  "team-manager": {
    title: "Team Manager",
    blurb:
      "Enter the team manager's details and upload their passport photograph.",
  },
  "assistant-coach": {
    title: "Assistant Coach",
    blurb:
      "Enter the assistant coach's details and upload their passport photograph.",
  },
  medics: {
    title: "Team Medics",
    blurb:
      "Enter the details of the team's two medics and upload their passport photographs.",
  },
};

const INPUT_CLASS =
  "w-full rounded-md border border-white/15 bg-slate-950/40 backdrop-blur-sm px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:bg-slate-950/60 focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all";

/**
 * One official's fields: photo, name, date of birth, nationality.
 *
 * Only the date and nationality carry `required`, and only once a name has been
 * typed. That is the whole rule for staff: an official nobody entered is absent,
 * not incomplete, so a team without an assistant coach or a second medic can
 * press Continue on an untouched block and move on. The moment a name appears,
 * the browser insists on the other two — matching officialBlockingGaps(), which
 * the review screen and the submit step enforce with the same logic.
 */
function PersonFields({
  heading,
  idPrefix,
  person,
  onPatch,
}: {
  /** Shown above the block; omitted (null) when the page has only one person. */
  heading: string | null;
  idPrefix: string;
  person: Official;
  onPatch: (patch: Partial<Official>) => void;
}) {
  const named = person.fullName.trim().length > 0;

  return (
    <div
      className={
        heading
          ? "rounded-xl border border-white/15 bg-slate-950/30 p-4 space-y-4"
          : "space-y-4"
      }
    >
      {heading && (
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#16a34a]">
          {heading}
        </h2>
      )}

      {/* Passport photo — optional, compressed the moment it's picked */}
      <div className="flex flex-col items-center justify-center gap-2 py-1">
        <PhotoUpload
          value={person.passport}
          onChange={(file) => onPatch({ passport: file })}
          label="Upload Passport"
          shape="square"
        />
      </div>

      {/* Full Name */}
      <div>
        <label
          htmlFor={`${idPrefix}FullName`}
          className="block text-xs font-medium text-slate-200 mb-1"
        >
          Full Name
        </label>
        <input
          type="text"
          id={`${idPrefix}FullName`}
          name={`${idPrefix}FullName`}
          value={person.fullName}
          onChange={(e) => onPatch({ fullName: e.target.value })}
          placeholder="e.g. John Doe"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Leave blank if the team doesn&apos;t have one.
        </p>
      </div>

      {/* Date Of Birth */}
      <div>
        <label
          htmlFor={`${idPrefix}DateOfBirth`}
          className="block text-xs font-medium text-slate-200 mb-1"
        >
          Date Of Birth
        </label>
        <input
          type="date"
          id={`${idPrefix}DateOfBirth`}
          name={`${idPrefix}DateOfBirth`}
          value={person.dateOfBirth}
          onChange={(e) => onPatch({ dateOfBirth: e.target.value })}
          required={named}
          className={`${INPUT_CLASS} [color-scheme:dark]`}
        />
      </div>

      {/* Nationality */}
      <div>
        <label
          htmlFor={`${idPrefix}Nationality`}
          className="block text-xs font-medium text-slate-200 mb-1"
        >
          Nationality
        </label>
        <input
          type="text"
          id={`${idPrefix}Nationality`}
          name={`${idPrefix}Nationality`}
          value={person.nationality}
          onChange={(e) => onPatch({ nationality: e.target.value })}
          placeholder="e.g. Nigerian"
          required={named}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

/**
 * Shared registration step for a team's non-coach officials.
 *
 * One component behind nine routes (three roles x three tournaments): the flows
 * are identical apart from their logo and their neighbouring routes, exactly as
 * RegistrationReview and SubmitFlow already are. Each flow's wrapper page passes
 * its own constants in.
 *
 * Nothing is sent from here — the details live in context until the submit step.
 */
export default function StaffFlow({
  role,
  logoSrc,
  logoAlt,
  backRoute,
  nextRoute,
  nextLabel,
}: Props) {
  const {
    teamManager,
    setTeamManager,
    assistantCoach,
    setAssistantCoach,
    medics,
    setMedics,
  } = useRegister();
  const router = useRouter();

  const copy = COPY[role];

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Nothing is sent here — the details live in context until the submit step.
    router.push(nextRoute);
  };

  // Mapped from the array rather than indexed, so a medics list of any length
  // renders without reaching past its end.
  const blocks =
    role === "medics"
      ? medics.map((medic, index) => ({
          key: medic.id || `medic-${index}`,
          heading: `Medic ${index + 1}`,
          idPrefix: `medic${index + 1}`,
          person: medic,
          onPatch: (patch: Partial<Official>) =>
            setMedics((prev) =>
              prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
            ),
        }))
      : [
          role === "team-manager"
            ? {
                key: "team-manager",
                heading: null,
                idPrefix: "teamManager",
                person: teamManager,
                onPatch: (patch: Partial<Official>) =>
                  setTeamManager((prev) => ({ ...prev, ...patch })),
              }
            : {
                key: "assistant-coach",
                heading: null,
                idPrefix: "assistantCoach",
                person: assistantCoach,
                onPatch: (patch: Partial<Official>) =>
                  setAssistantCoach((prev) => ({ ...prev, ...patch })),
              },
        ];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden">
        {/* Back Link to Previous Page */}
        <button
          type="button"
          onClick={() => router.push(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4 relative z-10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="mb-4 flex justify-center">
            <Image
              src={logoSrc}
              height="800"
              width="1200"
              alt={logoAlt}
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-xs text-slate-300 max-w-xs leading-relaxed">
            {copy.blurb} This step is optional — continue without it if the team
            has nobody in this role.
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-6 space-y-4 relative z-10" onSubmit={handleSubmit}>
          {blocks.map((block) => (
            <PersonFields
              key={block.key}
              heading={block.heading}
              idPrefix={block.idPrefix}
              person={block.person}
              onPatch={block.onPatch}
            />
          ))}

          {/* Continue Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2 px-4 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#15803d] shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 focus:ring-offset-[#0f172a]"
            >
              <span>{nextLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
