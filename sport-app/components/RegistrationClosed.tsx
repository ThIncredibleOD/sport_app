"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { Tournament } from "@/lib/tournaments";

/**
 * Shown in place of every step of a closed tournament's registration flow.
 *
 * It lives in the flow's layout, so it covers all eight steps at once —
 * including a bookmarked or typed-in deep link to a later step, which is the
 * case a hidden button on /register would miss entirely.
 *
 * It says what to do next rather than only what went wrong: a team standing at
 * the desk being told "closed" needs to know whether their existing entry is
 * affected, and the operator needs somewhere to go.
 */
export default function RegistrationClosed({
  tournament,
}: {
  tournament: Tournament;
}) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div className="bg-slate-800 absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" />
      <div className="absolute inset-0 bg-slate-950/50" />

      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden flex flex-col items-center text-center">
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/60">
            <Lock className="h-7 w-7 text-slate-400" />
          </div>

          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Registration closed
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {tournament.name}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Entries for {tournament.subtitle} are complete, and no new teams can
            be registered.
          </p>
          <p className="mt-2 text-[11px] sm:text-xs text-slate-400 leading-relaxed">
            Teams already registered are not affected — their entry stands.
          </p>

          <Link
            href="/register"
            className="group mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-[#16a34a] hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
          >
            <ArrowLeft className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-emerald-400" />
            Back to tournaments
          </Link>
        </div>
      </div>
    </div>
  );
}
