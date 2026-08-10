"use client";

import Image from "next/image";

export default function Partners() {
  return (
    <section className="w-full bg-white py-8 md:py-12 border-t border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        {/* Title Block */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-sm md:text-base font-extrabold tracking-[0.15em] text-slate-900 uppercase">
            Backed by Trusted Partners & Sponsors
          </h2>
        </div>

        {/* Logo Grid (4 Items) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center justify-items-center w-full">
          {/* Logo 1 */}
          <div className="relative w-[150px] h-[60px] md:w-[180px] md:h-[75px] transition-all duration-300">
            <Image
              src="/logo1.png"
              alt="FreeStack Inc. Logo"
              fill
              className="object-contain"
            />
          </div>

          {/* Logo 2 */}
          <div className="relative w-[150px] h-[60px] md:w-[180px] md:h-[75px] transition-all duration-300">
            <Image
              src="/logo2.jpg"
              alt="Let Her Play Logo"
              fill
              className="object-contain"
            />
          </div>

          {/* Logo 3 */}
          <div className="relative w-[150px] h-[60px] md:w-[180px] md:h-[75px] transition-all duration-300">
            <Image
              src="/logo3.jpg"
              alt="Peakline Sports World Logo"
              fill
              className="object-contain"
            />
          </div>

          {/* Logo 4  */}
          <a
            href="https://gearemup.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-[150px] h-[60px] md:w-[180px] md:h-[75px] transition-all duration-300 hover:opacity-80 cursor-pointer block"
          >
            <Image
              src="/logo4.png"
              alt="Gear em up logo"
              fill
              className="object-contain"
            />
          </a>
        </div>
      </div>
    </section>
  );
}