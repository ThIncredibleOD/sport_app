"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { TOURNAMENTS, Tournament } from "@/lib/tournaments";

export default function RegisterTournament() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Background Image */}
      <div
        className="bg-slate-800 absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
      />
      {/* Dark Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden flex flex-col items-center text-center">
        {/* Header / Main Logo Section */}
        <div className="flex flex-col items-center relative z-10 w-full">
          <div className="mb-4 flex justify-center">
            <img
              src="/logo.png"
              alt="Peakline Sports World"
              className="h-28 sm:h-32 w-auto object-contain drop-shadow-md"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
            Register
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
            Select a tournament below to begin your academy&apos;s enrollment.
          </p>
        </div>

        {/* Tournament selection. Rendered from lib/tournaments.ts so a closed
            tournament cannot be closed here but left open somewhere else. */}
        <div className="mt-6 w-full space-y-3 relative z-10">
          {TOURNAMENTS.map((tournament) => (
            <TournamentOption
              key={tournament.slug}
              tournament={tournament}
              onSelect={() =>
                router.push(`/register/${tournament.flow}/account-profile`)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * One row of the picker.
 *
 * A closed tournament stays visible and keeps its logo — a team arriving to
 * register needs to be told the entries are complete, not left wondering
 * whether they are on the wrong page. It renders as a plain div rather than a
 * disabled button so there is no clickable target at all.
 */
function TournamentOption({
  tournament,
  onSelect,
}: {
  tournament: Tournament;
  onSelect: () => void;
}) {
  const { name, subtitle, logo, registrationOpen } = tournament;

  const body = (
    <>
      <div className="flex items-center gap-3 text-left">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-1 ${
            registrationOpen ? "" : "opacity-40 grayscale"
          }`}
        >
          <img src={logo} alt={name} className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs sm:text-sm font-semibold transition-colors ${
              registrationOpen
                ? "text-white group-hover:text-emerald-400"
                : "text-slate-400"
            }`}
          >
            {name}
          </span>
          <span
            className={`text-[10px] sm:text-xs font-normal ${
              registrationOpen ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {registrationOpen ? subtitle : "Registration closed"}
          </span>
        </div>
      </div>
      {registrationOpen ? (
        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
      ) : (
        <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Closed
        </span>
      )}
    </>
  );

  if (!registrationOpen) {
    return (
      <div
        aria-disabled="true"
        className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-slate-950/20 backdrop-blur-sm p-3.5 cursor-not-allowed select-none"
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-3.5 transition-all duration-200 hover:border-[#16a34a] hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
    >
      {body}
    </button>
  );
}
