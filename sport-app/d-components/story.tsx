"use client";

import React from 'react';

export default function Story() {
  return (
    <section className="bg-[#0f172a] text-slate-100 p-8 font-sans w-full border-b border-slate-700">
      {/* Container that stretches fully across the width */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Column: Text Content */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wide text-white">Our Story</h2>
          
          <div className="space-y-3 text-[13px] text-slate-300 leading-relaxed">
            <p>
              In Peakline we believe in the power of sport to transform lives, build character, and unite communities. We are creating a new era of sports excellence
            </p>
            <p>
              In Peakline we believe in the power of sport to transform lives, build character, and unite communities. We are creating a new era of sports excellence
            </p>
            <p>
              In Peakline we believe in the power of sport to transform lives, build character, and unite communities. We are creating a new era of sports excellence
            </p>
            <p>
              In Peakline we believe in the power of sport to transform lives, build character, and unite communities. We are creating a new era of sports excellence
            </p>
          </div>
        </div>

        {/* Right Column: Image Mosaic */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Big Top Image */}
          <div className="col-span-2">
            <img 
              src="/legacy.png" 
              alt="Match Action" 
              className="w-full h-44 object-cover object-top rounded-xl"
              
            />
          </div>
          {/* Bottom Left Image */}
          <div>
            <img 
              src="/story1.png" 
              alt="Team Huddle" 
              className="w-full h-28 object-cover rounded-xl"
            />
          </div>
          {/* Bottom Right Image */}
          <div>
            <img 
              src="/story2.png" 
              alt="Team Lineup" 
              className="w-full h-28 object-cover rounded-xl"
            />
          </div>
        </div>

      </div>
    </section>
  );
}