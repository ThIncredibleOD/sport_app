"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Spons() {
  return (
    <section className="w-full bg-green-800 text-white py-6 md:py-8 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        
        {/* Left Side: Tight Content Block */}
        <div className="max-w-xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight leading-tight mb-1">
            Ready to Shape the Future of <span className="text-yellow-400">Nigerian Sports?</span>
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium">
            Join us in building a stronger, more inclusive and successful sporting environment for all.
          </p>
        </div>

        {/* Right Side: Dual Inline Compact Buttons */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          
          {/* Register Button */}
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs sm:text-sm py-2 px-4 sm:px-5 rounded-lg transition-all duration-300 shadow-sm hover:shadow group"
          >
            Register Your Team
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

        
        </div>

      </div>
    </section>
  );
}