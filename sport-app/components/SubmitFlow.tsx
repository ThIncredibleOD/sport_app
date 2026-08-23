"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  newRegistrationId,
  submitRegistration,
  type PlayerInput,
} from "@/lib/api/registration";
import { registrationReference } from "@/lib/reference";
import { generateRegistrationReceipt } from "@/lib/pdf/generateReceipt";
import { useRegister, playerBlockingGaps } from "@/context/sportContext";

type Props = {
  /** Must match the `slug` column in the `tournaments` table. */
  tournamentSlug: string;
  tournamentName: string;
  logoSrc: string;
  logoAlt: string;
  /** Back link — returns to this flow's review screen (data persists in context). */
  reviewRoute: string;
  /** Where to land after a successful submission. Gets ?reg= & ?pdf= appended. */
  confirmationRoute: string;
};

/**
 * Final step of a registration: confirm and submit.
 *
 * This does one thing — write the roster to the database and hand back a
 * reference. No fee is quoted or recorded and no mail is sent: money and
 * follow-up are handled off the site entirely, and the database is the record.
 */
export default function SubmitFlow({
  tournamentSlug,
  tournamentName,
  logoSrc,
  logoAlt,
  reviewRoute,
  confirmationRoute,
}: Props) {
  const router = useRouter();
  const { academyProfile, headCoach, players, resetForm } = useRegister();

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Submitting Registration...");
  const [errorMessage, setErrorMessage] = useState("");
  // Honeypot: invisible to people, irresistible to naive bots. A non-empty value
  // means the submit didn't come from a human, so we drop it silently rather
  // than showing an error that would tell a scripted client what went wrong.
  const [honeypot, setHoneypot] = useState("");

  const filledPlayers = players.filter((p) => p.fullName.trim().length > 0);

  // Completeness gate — same rule as the review screen (shared helper), repeated
  // here because someone can deep-link straight to this page. submitRegistration
  // types proof_of_age as a required File, so a missing one would throw
  // mid-upload and leave a half-written registration behind.
  const academyGaps: string[] = [];
  if (!academyProfile.academyName.trim()) academyGaps.push("academy name");
  if (!academyProfile.name.trim()) academyGaps.push("contact name");
  if (!academyProfile.contactNumber.trim()) academyGaps.push("contact number");
  if (!academyProfile.email.trim()) academyGaps.push("email");
  if (!headCoach.fullName.trim()) academyGaps.push("head coach name");

  const playersWithGaps = filledPlayers.filter(
    (p) => playerBlockingGaps(p).length > 0,
  ).length;
  const hasNoPlayers = filledPlayers.length === 0;
  const isComplete =
    !hasNoPlayers && playersWithGaps === 0 && academyGaps.length === 0;

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (honeypot.trim()) return;

    if (!isComplete) {
      setErrorMessage(
        "Your registration is incomplete. Please go back to Review and finish every player and academy detail.",
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Build the roster summary PDF from the in-memory File objects.
      //    The id is allocated HERE, before the PDF, so the printed summary can
      //    carry the same reference number the team will be looked up by.
      const regId = newRegistrationId();
      setStatusText("Generating your summary...");
      const submittedAtLabel = new Date().toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const pdfBlob = await generateRegistrationReceipt({
        tournamentName,
        academyName: academyProfile.academyName,
        contactName: academyProfile.name,
        contactEmail: academyProfile.email,
        contactPhone: academyProfile.contactNumber,
        teamLogo: academyProfile.logo,
        coachName: headCoach.fullName,
        coachDob: headCoach.dateOfBirth,
        coachNationality: headCoach.nationality,
        coachPhoto: headCoach.passport,
        players: filledPlayers.map((p) => ({
          full_name: p.fullName,
          dob: p.dateOfBirth,
          nationality: p.nationality,
          jersey_number: p.jerseyNumber,
          position: p.position,
          photo: p.passport,
        })),
        submittedAtLabel,
        reference: registrationReference(regId),
      });

      // 2. Upload everything + insert the registration in a single shot.
      const playerInputs: PlayerInput[] = filledPlayers.map((p) => ({
        full_name: p.fullName,
        dob: p.dateOfBirth,
        nationality: p.nationality,
        position: p.position,
        jersey_number: p.jerseyNumber,
        photo: p.passport,
        proof_of_age: p.proofOfAge as File,
      }));

      const { id, receipt_pdf_url } = await submitRegistration({
        tournament_slug: tournamentSlug,
        id: regId,
        contact_name: academyProfile.name,
        contact_phone: academyProfile.contactNumber,
        contact_email: academyProfile.email,
        academy_name: academyProfile.academyName,
        coach_full_name: headCoach.fullName,
        coach_dob: headCoach.dateOfBirth,
        coach_nationality: headCoach.nationality,
        team_logo: academyProfile.logo,
        coach_photo: headCoach.passport,
        players: playerInputs,
        receipt_pdf_blob: pdfBlob,
        onProgress: setStatusText,
      });

      // 3. Navigate to the confirmation page, then clear the in-memory form so
      //    the back button can't resubmit the same registration.
      const params = new URLSearchParams({ reg: id });
      if (receipt_pdf_url) params.set("pdf", receipt_pdf_url);
      router.push(`${confirmationRoute}?${params.toString()}`);
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit registration. Please try again.";
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white overflow-hidden">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push(reviewRoute)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4 relative z-10 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Review</span>
        </button>

        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="mb-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={logoAlt}
              className="h-24 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
            Confirm &amp;<br />Submit
          </h1>
          <p className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed">
            This is the last step. Submitting saves the roster and gives it a
            reference number.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-2.5 rounded bg-red-500/20 border border-red-500/40 text-xs text-red-200 text-center relative z-10">
            {errorMessage}
          </div>
        )}

        {/* Completeness gate. Informational, not alarming — nothing has been
            committed at this point, so there is nothing to lose. */}
        {!isComplete && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 text-xs text-amber-100 relative z-10">
            <p className="flex items-center gap-1.5 font-semibold text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Finish these before submitting
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-0.5 text-amber-200/90">
              {hasNoPlayers && <li>Add at least one player.</li>}
              {academyGaps.length > 0 && (
                <li>Academy details missing: {academyGaps.join(", ")}.</li>
              )}
              {playersWithGaps > 0 && (
                <li>
                  {playersWithGaps} player{playersWithGaps === 1 ? "" : "s"} still
                  missing required details or proof of age.
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => router.push(reviewRoute)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/10 py-2 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Review &amp; fix
            </button>
          </div>
        )}

        <form className="mt-6 space-y-4 relative z-10" onSubmit={handleSubmit}>
          {/* Honeypot — positioned off-screen rather than display:none, since some
              bots skip hidden fields but happily fill positioned ones. */}
          <input
            type="text"
            name="company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          {/* What actually happens on submit */}
          <div className="rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-4 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-white">When you submit</p>
            <ul className="ml-4 list-disc space-y-1 text-slate-400">
              <li>The roster is saved and given a reference number.</li>
              <li>A printable summary is available to download.</li>
            </ul>
          </div>

          {/* Summary line */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-[#16a34a]" />
            <span>
              Submitting {filledPlayers.length} player
              {filledPlayers.length === 1 ? "" : "s"} for {tournamentName}.
            </span>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || !isComplete}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2.5 px-4 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#15803d] shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{statusText}</span>
                </>
              ) : (
                <>
                  <span>Submit Registration</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
