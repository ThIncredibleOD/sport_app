"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

export default function SquadComplete() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5); // 5-second countdown

  useEffect(() => {
    // ⏱️ Decrement the countdown state every second
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    // Automatically redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/unity-squad'); 
    }, 5000);

    // Clean up timers on unmount
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/*  Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden flex flex-col items-center text-center">
        
        {/* Back Button */}
        <div className="w-full flex justify-start relative z-10 mb-2">
          <button 
            type="button"
            onClick={() => router.push('/unity-playereg')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center relative z-10">
          <div className="mb-6 flex justify-center">
            <img 
              src="/unity.png" 
              alt="The Nathaniel Idowu Unity Football League" 
              className="h-28 w-auto object-contain drop-shadow-md"
            />
          </div>
        </div>

        {/* Success Icon */}
        <div className="relative z-10 my-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#16a34a] flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Check className="h-8 w-8 text-white stroke-[3]" />
          </div>
        </div>

        {/* Completion Message */}
        <div className="relative z-10 mt-3 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm">
            Squad Complete!
          </h1>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
            Great job! You have successfully registered your 18 players.
          </p>
        </div>

        {/*  Redirect Countdown Badge */}
        <div className="relative z-10 mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-300 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Redirecting in <strong className="text-white font-mono">{countdown}s</strong>...</span>
        </div>

      </div>
    </div>
  );
}