"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileText,
  Home,
  MessageCircle,
} from "lucide-react";
import { registrationReference } from "@/lib/reference";

type Props = {
  regId: string;
  pdfUrl: string;
  tournamentName: string;
  logoSrc: string;
  logoAlt: string;
};

const WHATSAPP_DISPLAY = "08093684335";
// International format for the wa.me deep link (Nigeria +234, drop leading 0).
const WHATSAPP_LINK = "https://wa.me/2348093684335";

/**
 * Shown once a registration has been committed.
 *
 * Deliberately minimal: it states that the roster was saved, gives the reference
 * it will be looked up by, and offers the printable summary. Nothing about fees
 * or next steps — those are handled off the site.
 */
export default function RegistrationConfirmation({
  regId,
  pdfUrl,
  tournamentName,
  logoSrc,
  logoAlt,
}: Props) {
  const router = useRouter();
  const reference = regId ? registrationReference(regId) : "—";

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white overflow-hidden">
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={logoAlt}
            className="h-20 w-auto object-contain drop-shadow-md"
          />

          <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a]/15 border border-[#16a34a]/40">
            <CheckCircle2 className="h-8 w-8 text-[#16a34a]" />
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white uppercase leading-tight">
            Registration Saved
          </h1>
          <p className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed">
            This team is registered for {tournamentName}.
          </p>
        </div>

        {/* Reference */}
        <div className="mt-5 rounded-xl border border-white/15 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Reference</span>
            <span className="font-mono font-bold text-white tracking-wider">
              {reference}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            This team is looked up by this reference. It&apos;s printed on the
            summary document below.
          </p>
        </div>

        {/* Download summary */}
        <div className="mt-4">
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#16a34a] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#15803d] transition-all shadow-lg shadow-emerald-950/50"
            >
              <Download className="h-4 w-4" />
              <span>Download Registration Summary</span>
            </a>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-slate-950/40 py-2.5 px-4 text-xs font-medium text-slate-400">
              <FileText className="h-4 w-4" />
              <span>No summary document was saved</span>
            </div>
          )}
        </div>

        {/* WhatsApp help */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/15 bg-slate-950/40 p-3 text-[11px] text-slate-300">
          <MessageCircle className="h-4 w-4 shrink-0 text-[#16a34a]" />
          <span>
            Something wrong with these details? Message the official WhatsApp
            line{" "}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-[#16a34a]/60 underline-offset-2"
            >
              {WHATSAPP_DISPLAY}
            </a>
            .
          </span>
        </div>

        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/15 bg-slate-950/60 py-2 px-4 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
}
