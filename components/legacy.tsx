"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Legacy() {
  return (
    <section className="w-full bg-white text-slate-900 overflow-hidden border-b border-slate-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[280px] lg:min-h-[350px] w-full">
        {/* Left Side: Slim Action Image */}
        <div className="relative w-full h-[180px] sm:h-[220px] lg:h-auto min-h-[180px] lg:min-h-full">
          <Image
            src="/legacy-pic.jpg"
            alt="Futsal legacy match action"
            fill
            priority
            className="object-cover object-center"
          />
        </div>

        {/* Right Side: Ultra-Tight Text Content Block */}
        <div className="flex flex-col justify-center items-start px-4 py-5 sm:px-8 md:px-10 lg:px-12 w-full bg-white">
          {/* Subheading (Reduced size and margin) */}
          <span className="text-[10px] font-bold tracking-[0.25em] text-green-700 uppercase block mb-1">
            Our Legacy
          </span>

          {/* Main Title (Sleek and tight) */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 uppercase leading-[1.1] mb-2">
            Pioneers of Futsal <br />
            in <span className="text-green-700">Grassroots Sports</span>
          </h2>

          {/* Paragraph (Compact text size with tight bottom margin) */}
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mb-4">
            After a brief intermission, Peaklin Sports World is fully
            reactivated, evolved, and ready to set a higher standard for
            Nigerian sports.
          </p>

          {/* Compact Low-Profile Green Button */}
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 bg-green-800 hover:bg-green-900 text-white font-bold text-xs py-4 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            Discover Our Journey
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
