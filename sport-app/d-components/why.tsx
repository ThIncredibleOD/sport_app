"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

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
  
  <li className="flex items-center gap-3">
    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
    <span className="text-[13px] text-slate-200">
     Brand visibility at tournaments, camps, and on Live YouTube
    </span>
  </li>

  <li className="flex items-center gap-3">
    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
    <span className="text-[13px] text-slate-200">
      Community engagement across 20+ LGAs in Lagos
    </span>
  </li>

  <li className="flex items-center gap-3">
    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
    <span className="text-[13px] text-slate-200">
      CSR impact through youth development and health programs
    </span>
  </li>

  <li className="flex items-center gap-3">
    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
    <span className="text-[13px] text-slate-200">
       Access to a database of 1000+ young athletes annually.
    </span>
  </li>
</ul>
  </div>

        {/* Right Column: Featured Image */}
        <div className="w-full">
          <Image
            src="/why1.jpg"
            alt="Player celebrating in stadium"
            height="800"
            width="1200"
            className="w-full h-64 object-cover object-top rounded-xl shadow-lg"
          />
        </div>
      </div>
    </section>  
  );
}
