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
} from "lucide-react";
import {
  submitRegistration,
  uploadPaymentReceipt,
} from "@/lib/api/registration";
import { useRegister } from "@/context/sportContext";

export default function RegistrationPayment() {
  const router = useRouter();

  // Access state saved from previous steps
  const { formData, resetForm } = useRegister();

  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const accountNumber = "1000455849";

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber);
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

    if (!formData.academy_name || formData.players.length === 0) {
      setErrorMessage(
        "Registration details are incomplete. Please go back and complete all steps.",
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      //  Create registration row, upload team logo, upload all player files & roster
      const newRegistration = await submitRegistration({
        tournament_slug: "secondary-league", // Ensure this matches your tournament slug
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        academy_name: formData.academy_name,
        coach_full_name: formData.coach_full_name,
        coach_dob: formData.coach_dob,
        coach_nationality: formData.coach_nationality,
        team_logo: formData.team_logo || undefined,
        players: formData.players,
      });

      // Upload payment receipt linked to the newly created registration ID
      await uploadPaymentReceipt(newRegistration.id, receiptFile);

      // 3. Reset client state after successful save
      resetForm();

      // 4. Navigate to confirmation review page passing the new registration ID
      router.push(`/secondary-payrev?regId=${newRegistration.id}`);
    } catch (error: any) {
      setErrorMessage(
        error.message || "Failed to submit registration. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push("/secondary-playreg")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4 relative z-10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="mb-4 flex justify-center">
            <img
              src="/secondary.png"
              alt="The Nathaniel Idowu Secondary Football League"
              className="h-28 w-auto object-contain drop-shadow-md"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
            Registration Fee &<br />
            Payment
          </h1>
          <p className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed">
            Please transfer the registration fee to the account below and upload
            your receipt to secure one of the 10 available slots.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-2.5 rounded bg-red-500/20 border border-red-500/40 text-xs text-red-200 text-center relative z-10">
            {errorMessage}
          </div>
        )}

        {/* Form Container */}
        <form className="mt-6 space-y-4 relative z-10" onSubmit={handleSubmit}>
          {/* Payment Info Box */}
          <div className="rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Amount:</span>
              <span className="font-bold text-white text-sm">₦50,000</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bank Name:</span>
              <span className="font-semibold text-white">Globus Bank</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Account Name:</span>
              <span className="font-semibold text-white text-right max-w-[180px]">
                Peakline Sports World Ltd
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <span className="text-slate-400">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">
                  {accountNumber}
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

            {/* Upload Receipt Button */}
            <div className="pt-2">
              <label className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] py-2.5 px-4 text-xs font-semibold text-slate-950 transition-all cursor-pointer shadow-md">
                <Upload className="h-4 w-4" />
                <span className="truncate max-w-[200px]">
                  {receiptFile ? receiptFile.name : "Upload Receipt"}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Warning Note */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Payments are confirmed within 24 hours.</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2 px-4 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#15803d] shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <span>Next</span>
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
