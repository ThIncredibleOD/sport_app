"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[85vh] bg-slate-950 flex items-center overflow-hidden border-b border-slate-700">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero.png"
          alt="Grassroots football action"
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
        <div className="max-w-xl md:max-w-2xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none uppercase">
            More Than <br />
            A Game <br />
          <span className="text-amber-400">We Are <br/>
                A Movement.   </span>  
          </h1>

          <p className="mt-6 text-base md:text-lg text-slate-300 font-medium max-w-lg leading-relaxed">
          In Peakline we believe in the power of sport
           to transform lives, build character, and unite communities.
            We are creating a new era of sports excellence.
          </p>

          {/* Glass Button Group Container */}
          <div className="mt-10 flex flex-wrap gap-4 items-center">
            
            {/* Button 1: Green Glass Button */}
            <Link
              href="#leagues"
              className="flex items-center gap-2 bg-green-800/40 hover:bg-green-800/60 border border-green-500/30 backdrop-blur-md text-white font-semibold px-6 py-3.5 rounded-lg shadow-lg shadow-green-950/20 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              Explore Our Leagues
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
