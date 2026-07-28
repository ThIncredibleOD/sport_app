"use client";


import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Trophy, Users } from 'lucide-react';

export default function Deets() {
  const [yearCount, setYearCount] = useState(1);
  const [futsalCount, setFutsalCount] = useState(100);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        // Only run the animation when the section is visible on screen
        if (entry.isIntersecting) {
          
          // 1. Count up to 2000 extremely fast (Duration: 1.2s)
          let yearStartTime: number | null = null;
          const yearDuration = 1200; 
          const startYear = 1;
          const endYear = 2000;

          const animateYear = (timestamp: number) => {
            if (!yearStartTime) yearStartTime = timestamp;
            const progress = timestamp - yearStartTime;
            const percentage = Math.min(progress / yearDuration, 1);
            
            const current = Math.floor(startYear + percentage * (endYear - startYear));
            setYearCount(current);

            if (percentage < 1) {
              requestAnimationFrame(animateYear);
            } else {
              setYearCount(endYear);
            }
          };

          // 2. Count down to 1st extremely fast (Duration: 1s)
          let futsalStartTime: number | null = null;
          const futsalDuration = 1000;
          const startFutsal = 100;
          const endFutsal = 1;

          const animateFutsal = (timestamp: number) => {
            if (!futsalStartTime) futsalStartTime = timestamp;
            const progress = timestamp - futsalStartTime;
            const percentage = Math.min(progress / futsalDuration, 1);

            const current = Math.floor(startFutsal + percentage * (endFutsal - startFutsal));
            setFutsalCount(current);

            if (percentage < 1) {
              requestAnimationFrame(animateFutsal);
            } else {
              setFutsalCount(endFutsal);
            }
          };

          requestAnimationFrame(animateYear);
          requestAnimationFrame(animateFutsal);

          // Once it has animated once, stop observing to prevent resetting on every scroll
          if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
          }
        }
      },
      {
        threshold: 0.1, // Triggers when at least 10% of the section is visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="w-full bg-white py-8 md:py-12 text-slate-900 border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-4 items-center">
        
        {/* Left Column: Heading Block */}
        <div className="lg:pr-8 pb-6 lg:pb-0">
          <span className="text-xs font-bold tracking-widest text-green-700 uppercase block mb-1">
            A New Chapter.
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-slate-950 uppercase">
            The Same <br className="hidden lg:block" /> Commitment.
          </h2>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed max-w-sm">
            After a brief intermission, Peakline Sports World is fully reactivated, evolved, and ready to set a higher standard for Nigerian sports.
          </p>
        </div>

        {/* Right Columns: Grid of 3 Stats with Thin Dividers */}
        <div className="lg:col-span-3 flex flex-col md:flex-row items-center justify-between w-full gap-8 md:gap-2">
          
          {/* Stat 1: Year Established */}
          <div className="flex flex-1 flex-col items-center text-center px-4">
            <div className="text-green-700 mb-2">
              <Calendar className="w-7 h-7 stroke-[1.5]" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
              {yearCount}
            </span>
            <span className="text-[10px] font-bold tracking-wider text-green-700 uppercase mt-1">
              ESTABLISHED
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-medium max-w-[180px]">
              Over two decades of impact and excellence.
            </p>
          </div>

          {/* Divider Line 1 */}
          <div className="hidden md:block h-16 w-[1px] bg-slate-300 self-center" />

          {/* Stat 2: Futsal Pioneer */}
          <div className="flex flex-1 flex-col items-center text-center px-4">
            <div className="text-green-700 mb-2">
              <Trophy className="w-7 h-7 stroke-[1.5]" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none">
              {futsalCount}st
            </span>
            <span className="text-[10px] font-bold tracking-wider text-green-700 uppercase mt-1">
              TO PIONEER FUTSAL
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-medium max-w-[180px]">
              Over two decades of impact and excellence.
            </p>
          </div>

          {/* Divider Line 2 */}
          <div className="hidden md:block h-16 w-[1px] bg-slate-300 self-center" />

          {/* Stat 3: Coaches Trained */}
          <div className="flex flex-1 flex-col items-center text-center px-4">
            <div className="text-green-700 mb-2">
              <Users className="w-7 h-7 stroke-[1.5]" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-none uppercase">
              HUNDREDS
            </span>
            <span className="text-[10px] font-bold tracking-wider text-green-700 uppercase mt-1 whitespace-nowrap">
              OF TRAINED COACHES & ADMINISTRATORS
            </span>
            <p className="mt-1 text-[11px] text-slate-500 font-medium max-w-[180px]">
              Over two decades of impact and excellence.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}