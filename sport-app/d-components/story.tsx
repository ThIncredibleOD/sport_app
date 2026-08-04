"use client";

import Image from "next/image";

export default function Story() {
  return (
    <section className="bg-[#0f172a] text-slate-100 p-8 font-sans w-full border-b border-slate-700">
      {/* Container that stretches fully across the width */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Text Content */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wide text-white">
            Our Story
          </h2>

          <div className="space-y-3 text-[13px] text-slate-300 leading-relaxed">
            <p>
           Peakline Sports World Limited is a leading grassroots sports development and event management company in Nigeria.
            For over 25 years, we have been committed to discovering, nurturing, and providing professional platforms for young athletes to thrive in sports, education, and life.

            </p>
            <p>
            We organize football tournaments, summer camps, training programmes, and community sports initiatives aimed at youth empowerment,
             unity, and national development.

            </p>
            
            <p>
              In Peakline we believe in the power of sport to transform lives,
              build character, and unite communities. We are creating a new era
              of sports excellence
            </p>
          </div>
        </div>

        {/* Right Column: Image Mosaic */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Big Top Image */}
          <div className="col-span-2">
            <Image
              src="/story1.jpg"
              alt="Match Action"
              height="800"
              width="1200"
              className="w-full h-44 object-cover object-center rounded-xl"
            />
          </div>
          {/* Bottom Left Image */}
          <div>
            <Image
              src="/story2.png"
              alt="Team Huddle"
              height="800"
              width="1200"
              className="w-full h-28 object-cover rounded-xl"
            />
          </div>
          {/* Bottom Right Image */}
          <div>
            <Image
              src="/story3.jpg"
              alt="Team Huddle"
              height="800"
              width="1200"
              className="w-full h-28 object-cover object-center rounded-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
