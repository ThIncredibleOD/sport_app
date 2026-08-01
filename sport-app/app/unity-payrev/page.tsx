"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, HelpCircle } from 'lucide-react';

export default function PaymentUnderReview() {
  const router = useRouter();

  //  Automatically redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // push to the next page after 5 seconds
      router.push('/unity-squad'); 
    }, 5000); // 5000 milliseconds = 5 seconds

    // Clean up the timer if the user navigates away manually before time expires
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark  Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden flex flex-col items-center text-center">
        
        {/* Back Link (Anchored Top-Left) */}
        <div className="w-full flex justify-start relative z-10 mb-2">
          <button 
            type="button"
            onClick={() => router.push('/unity-payment')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Header / Tournament Logo */}
        <div className="flex flex-col items-center relative z-10">
          <div className="mb-4 flex justify-center">
            <img 
              src="/unity.png" 
              alt="The Nathaniel Idowu Unity Football League" 
              className="h-28 w-auto object-contain drop-shadow-md"
            />
          </div>
        </div>

        {/* Success Checkmark Circle */}
        <div className="relative z-10 my-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#16a34a] flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Check className="h-8 w-8 text-white stroke-[3]" />
          </div>
        </div>

        {/* Main Stats Text */}
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
            Payment Under<br />Review!
          </h1>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
            Thank you! We have received your proof of payment. Our team is currently verifying your transfer.
          </p>
        </div>

        {/* WhatsApp / Help Section */}
        <div className="relative z-10 mt-8 w-full pt-4 border-t border-white/10 flex items-center justify-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-950/40 text-slate-200">
            <HelpCircle className="h-5 w-5 stroke-[1.5]" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Questions, please reach out to our<br />
            official WhatsApp line: <span className="font-semibold text-white">08093684335</span>.
          </p>
        </div>

      </div>
    </div>
  );
}