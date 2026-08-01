"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function RegisterTournament() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Background Image */}
      <div
        className="bg-slate-800 absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        // style={{ backgroundImage: `url('/hero.png')` }}
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

        {/* Manual Tournament Selection Buttons */}
        <div className="mt-6 w-full space-y-3 relative z-10">
          {/* BUTTON 1: The U16 Football League */}
          <button
            type="button"
            onClick={() => router.push("/register/league/account-profile")}
            className="group flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-3.5 transition-all duration-200 hover:border-[#16a34a] hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-1">
                <img
                  src="/under1.png"
                  alt="The U16 Football League"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  The U16 Football League
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
                  Under-16 grassroots championship
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
          </button>

          {/* BUTTON 2: Secondary Cup */}
          <button
            type="button"
            onClick={() => router.push("/secondary-register")}
            className="group flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-3.5 transition-all duration-200 hover:border-[#16a34a] hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-1">
                <img
                  src="/secondary.png"
                  alt="Secondary Cup"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Secondary Cup
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
                  Inter-secondary school tournament
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
          </button>

          {/* BUTTON 3: Unity Cup */}
          <button
            type="button"
            onClick={() => router.push("/unity-register")}
            className="group flex w-full items-center justify-between rounded-xl border border-white/15 bg-slate-950/40 backdrop-blur-sm p-3.5 transition-all duration-200 hover:border-[#16a34a] hover:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 p-1">
                <img
                  src="/unity.png"
                  alt="Unity Cup"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Unity Cup
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
                  Regional community tournament
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
