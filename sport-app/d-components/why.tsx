"use client";

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Why() {
  return (
    <section className="bg-[#0f172a] text-slate-100 p-8 font-sans w-full border-b border-slate-700">
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Column: Headings and List */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-[25px] font-bold uppercase tracking-wide text-white">
              Why Register With
            </h2>
            <h3 className="text-[30px] font-bold uppercase tracking-wide text-amber-400">
              Peakline Sport World?
            </h3>
          </div>
          
          {/* Benefits List */}
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-[13px] text-slate-200">
                  Professional training and development
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Featured Image */}
        <div className="w-full">
          <img 
            src="/why1.png" 
            alt="Player celebrating in stadium" 
            className="w-full h-64 object-cover rounded-xl shadow-lg"
          />
        </div>

      </div>
    </section>
  );
}