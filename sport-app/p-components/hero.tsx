"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Calendar, Trophy } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[85vh] bg-slate-950 flex items-center overflow-hidden border-b border-slate-700">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pHero.jpg"
          alt="Championship celebration"
          fill
          priority
          className="object-cover object-right md:object-center opacity-80"
        />
      </div>

      {/* Dark overlays to keep text readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 md:via-slate-950/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-16 py-12 md:py-20">
        <div className="max-w-xl md:max-w-2xl space-y-6">
          <span className="text-[25px] text-emerald-500 tracking-tight leading-none uppercase font-bold">
            Photo Gallery
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-none uppercase">
            Capturing Passion. <br />
            <span className="text-amber-400">Celebrating Impact.</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-slate-300 font-medium leading-relaxed">
            In Peakline we believe in the power of sport to transform lives,
            build character, and unite communities. We are creating a new era of
            sports excellence.
          </p>

          <p className="mt-4 text-base md:text-lg text-slate-300 font-medium leading-relaxed">
            In Peakline we believe in the power of sport to transform lives,
            build character, and unite communities. We are creating a new era of
            sports excellence.
          </p>

          {/* Stats Bar Container (FIXED: Added horizontal flex wrapper) */}
          <div className="pt-6 flex flex-wrap items-center gap-8 sm:gap-10">
            {/* Stat 1: Photos */}
            <div className="flex items-center gap-4">
              <ImageIcon className="w-10 h-13 text-emerald-500 stroke-[1.5]" />
              <div className="flex flex-col text-left">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
                  2000+
                </span>
                <span className="text-sm font-medium text-slate-200 mt-1">
                  Photos
                </span>
              </div>
            </div>

            {/* Stat 2: Events */}
            <div className="flex items-center gap-4">
              <Calendar className="w-10 h-13 text-emerald-500 stroke-[1.5]" />
              <div className="flex flex-col text-left">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
                  50+
                </span>
                <span className="text-sm font-medium text-slate-200 mt-1">
                  Events
                </span>
              </div>
            </div>

            {/* Stat 3: Teams */}
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-13 text-emerald-500 stroke-[1.5]" />
              <div className="flex flex-col text-left">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
                  100+
                </span>
                <span className="text-sm font-medium text-slate-200 mt-1">
                  Teams
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
