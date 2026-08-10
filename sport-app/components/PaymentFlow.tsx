"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { submitRegistration, type PlayerInput } from "@/lib/api/registration";
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

const ACCOUNT_NUMBER = "1000455849";
const ACCOUNT_NAME = "Peakline Sports World Ltd";
const BANK_NAME = "Globus Bank";
const AMOUNT_LABEL = "₦50,000";

export default function PaymentFlow({
  tournamentSlug,
  tournamentName,
  logoSrc,
  logoAlt,
  reviewRoute,
  confirmationRoute,
}: Props) {
  const router = useRouter();
  const { academyProfile, headCoach, players, resetForm } = useRegister();

  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Submitting Registration...");
  const [errorMessage, setErrorMessage] = useState("");

  const filledPlayers = players.filter((p) => p.fullName.trim().length > 0);

  // Completeness gate — identical rule to the review screen (shared helper), but
  // repeated here because payment is OFF-SITE: a user could deep-link straight
  // to this page, transfer the fee, and only then hit a submit that throws on a
  // missing consent form / proof of age. We must refuse BEFORE they pay.
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

  const handleCopy = () => {
    navigator.clipboard.writeText(ACCOUNT_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptFile) {
      setErrorMessage("Please upload your payment receipt before proceeding.");
      return;
    }
    if (!isComplete) {
      setErrorMessage(
        "Your registration is incomplete. Please go back to Review and finish every player and academy detail before paying.",
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Build the roster PDF from the in-memory File objects (client-side).
      setStatusText("Generating your receipt...");
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
      });

      // 2. Upload everything + insert the registration in a single shot.
      setStatusText("Uploading your details...");
      const playerInputs: PlayerInput[] = filledPlayers.map((p) => ({
        full_name: p.fullName,
        dob: p.dateOfBirth,
        nationality: p.nationality,
        position: p.position,
        jersey_number: p.jerseyNumber,
        photo: p.passport,
        consent_form: p.consentForm as File,
        proof_of_age: p.proofOfAge as File,
      }));

      const { id, receipt_pdf_url } = await submitRegistration({
        tournament_slug: tournamentSlug,
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
        receipt_file: receiptFile,
        receipt_pdf_blob: pdfBlob,
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
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      <div className="absolute inset-0 bg-slate-950/50" />

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
            Registration Fee &amp;<br />Payment
          </h1>
          <p className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed">
            Transfer the registration fee to the account below, then upload your
            receipt to submit your team for approval.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-2.5 rounded bg-red-500/20 border border-red-500/40 text-xs text-red-200 text-center relative z-10">
            {errorMessage}
          </div>
        )}

        {/* Hard stop — payment is off-site, so we must block an incomplete team
            BEFORE they transfer any money. Mirrors the review screen's gate. */}
        {!isComplete && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-100 relative z-10">
            <p className="flex items-center gap-1.5 font-semibold text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Don&apos;t pay yet — your registration is incomplete
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-0.5 text-red-200/90">
              {hasNoPlayers && <li>Add at least one player.</li>}
              {academyGaps.length > 0 && (
                <li>Academy details missing: {academyGaps.join(", ")}.</li>
              )}
              {playersWithGaps > 0 && (
                <li>
                  {playersWithGaps} player{playersWithGaps === 1 ? "" : "s"} still
                  missing required details or documents (consent form / proof of
                  age).
                </li>
              )}
            </ul>
            <p className="mt-2 text-red-200/80">
              You transfer the fee yourself, so a submission that fails here
              can&apos;t be refunded. Go back and finish these first.
            </p>
            <button
              type="button"
              onClick={() => router.push(reviewRoute)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/10 py-2 px-3 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Review &amp; fix
            </button>
          </div>
        )}

        <form className="mt-6 space-y-4 relative z-10" onSubmit={handleSubmit}>
          {/* Payment Info */}
          <div className="rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Amount:</span>
              <span className="font-bold text-white text-sm">{AMOUNT_LABEL}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bank Name:</span>
              <span className="font-semibold text-white">{BANK_NAME}</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Account Name:</span>
              <span className="font-semibold text-white text-right max-w-[180px]">
                {ACCOUNT_NAME}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <span className="text-slate-400">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">
                  {ACCOUNT_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 text-slate-300 hover:text-white transition-colors"
                  title="Copy Account Number"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Upload Receipt */}
            <div className="pt-2">
              <label
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-semibold text-slate-950 transition-all shadow-md ${
                  isComplete
                    ? "bg-[#eab308] hover:bg-[#ca8a04] cursor-pointer"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Upload className="h-4 w-4" />
                <span className="truncate max-w-[200px]">
                  {receiptFile ? receiptFile.name : "Upload Receipt"}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading || !isComplete}
                />
              </label>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Payments are confirmed within 24 hours.</span>
            </div>
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
