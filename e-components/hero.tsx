"use client";

import React from "react";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[450px] sm:min-h-[500px] flex items-center overflow-hidden bg-[#0f172a]">
      {/* Background Image Wrapper */}
      <div
        className="absolute inset-0 bg-cover bg-right md:bg-center no-repeat select-none pointer-events-none"
        style={{ backgroundImage: `url('/newsHero.jpg')` }}
      />

      {/* Radial and Linear Gradient Shadow Overlay for Perfect Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent md:bg-gradient-to-r md:from-slate-950/95 md:via-slate-950/70 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />

      {/* Foreground Content Layout Grid */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Typography Block */}
        <div className="flex flex-col text-left space-y-4 max-w-md lg:max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none">
            News & <br />
            <span className="text-yellow-400">Updates</span>
          </h1>

          <p className="text-sm sm:text-base font-medium text-slate-300 leading-relaxed tracking-wide">
            Stay informed with the latest news, stories and updates from
            Peakline and the world of sports.
          </p>
        </div>

        {/* Right Side: Empty Column keeps text layout safely away from the athlete photo */}
        <div className="hidden md:block" />
      </div>
    </section>
  );
}
