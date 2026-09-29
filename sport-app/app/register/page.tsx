"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { TOURNAMENTS, Tournament } from "@/lib/tournaments";

export default function RegisterTournament() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div className="bg-slate-800 absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" />
      <div className="absolute inset-0 bg-slate-950/50" />

      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden flex flex-col items-center text-center">
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

        <div className="mt-6 w-full space-y-3 relative z-10">
          {TOURNAMENTS.map((tournament) => (
            <TournamentOption
              key={tournament.slug}
              tournament={tournament}
              onSelect={() => {
                const target = `/register/${tournament.flow}/account-profile`;
                // Admin-only flows detour through login carrying where they
                // were headed. This is convenience only — proxy.ts is what
                // actually refuses the flow, because a router.push is trivially
                // skipped by typing the URL.
                router.push(
                  tournament.adminOnly
                    ? `/admin/login?redirect=${encodeURIComponent(target)}`
                    : target,
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TournamentOption({
  tournament,
  onSelect,
}: {
  tournament: Tournament;
  onSelect: () => void;
}) {
  const { name, subtitle, logo, registrationOpen, adminOnly } = tournament;

  return (
    <button
      type="button"
      onClick={onSelect}
      // A closed tournament used to render its "Closed" badge and still
      // navigate when clicked, dropping you into a flow that immediately
      // replaced itself with the closed notice. The badge is now the truth.
      disabled={!registrationOpen}
      className="group flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-3.5 transition-all duration-200 enabled:hover:border-[#16a34a] enabled:hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center gap-3 text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-1">
          <img src={logo} alt={name} className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-semibold text-white group-enabled:group-hover:text-emerald-400 transition-colors">
            {name}
          </span>
          <span className="text-[10px] sm:text-xs font-normal text-slate-400">
            {registrationOpen && adminOnly ? "Admin Login Required" : subtitle}
          </span>
        </div>
      </div>

      {/* Closed is checked FIRST. A closed admin-only tournament previously
          showed "Admin Only" and read as available. */}
      {!registrationOpen ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Closed
        </span>
      ) : adminOnly ? (
        <span className="flex items-center gap-1 shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold tracking-wide text-amber-400">
          <Lock className="h-3 w-3" />
          Admin Only
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
      )}
    </button>
  );
}