"use client";

import React from 'react';
import Image from 'next/image';

export default function Partner() {
  return (
    <section className="w-full bg-white py-8 md:py-12 border-t border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        
        {/* Title Block */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-sm md:text-base font-extrabold tracking-[0.15em] text-slate-900 uppercase">
           TRUSTED BY PARTNERS WHO BELIEVE IN OUR MISSION
          </h2>
        </div>

        {/* Logo Grid */}
        <div className="flex flex-wrap items-center justify-between gap-12 md:gap-20 lg:gap-28 w-full">
          
          {/* Logo 1 */}
          <div className="relative w-[190px] h-[70px] md:w-[230px] md:h-[85px] transition-all duration-300">
            <Image
              src="/logo1.png"
              alt="FreeStack Inc. Logo"
              fill
              className="object-contain"
            />
          </div>

          {/* Logo 2 */}
          <div className="relative w-[170px] h-[85px] md:w-[210px] md:h-[105px] transition-all duration-300">
            <Image
              src="/logo2.jpg"
              alt="Let Her Play Logo"
              fill
              className="object-contain"
            />
          </div>

          {/* Logo 3 */}
          <div className="relative w-[210px] h-[70px] md:w-[250px] md:h-[85px] transition-all duration-300">
            <Image
              src="/logo3.jpg"
              alt="Peakline Sports World Logo"
              fill
              className="object-contain"
            />
          </div>

        </div>

      </div>
    </section>
  );
}