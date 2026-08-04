"use client";

import React from 'react';
import { Target, Eye, Heart } from 'lucide-react';

export default function OurPurpose() {
  return (
    <section className="bg-[#0f172a] text-slate-100 p-6 font-sans border-b border-slate-700">
      {/* Header Section */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="h-[1.7px] w-16 bg-green-500"></div>
        <h2 className="text-[20px] font-bold uppercase tracking-widest text-white">Our Purpose</h2>
        <div className="h-[1.7px] w-16 bg-green-500"></div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        
        {/* Item 1: Mission */}
        <div className="flex flex-col items-start space-y-2">
          <Target className="w-7 h-7 text-green-500" />
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-green-500">Our Mission</h3>
          </div>
          <p className="text-[13px] text-slate-300 leading-normal max-w-xs">
            To elevate grassroots sports development by discovering talent, empowering youth through education and unity, building local infrastructure, and opening doors to professional and academic opportunities.
          </p>
        </div>

        {/* Item 2: Vision */}
        <div className="flex flex-col items-start space-y-2 md:border-x md:border-slate-800 md:px-6">
          <Eye className="w-7 h-7 text-green-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-green-500">Our Vision</h3>
          <p className="text-[13px] text-slate-300 leading-normal max-w-xs">
           To build a generation of disciplined, healthy, and globally competitive athletes and leaders through sports.

          </p>
        </div>

        {/* Item 3: Value */}
        <div className="flex flex-col items-start space-y-2">
          <Heart className="w-7 h-7 text-green-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-green-500">Our Value</h3>
          <p className="text-[13px] text-slate-300 leading-normal max-w-xs">
            Excellence | Unity | Integrity | Empowerment | Community
          </p>
        </div>

      </div>
    </section>
  );
}