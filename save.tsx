"use client";

import React from 'react';
import Image from 'next/image';
import { ImageIcon, Medal, Trophy, Flame, Calendar, ArrowRight } from 'lucide-react'; 

export default function ImageGallery() {
  return (
    <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 w-full border-t border-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">

        {/*TOP FILTER BUTTONS  */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white shadow-md">
            <ImageIcon className="w-4 h-4" />
            <span>All Photos</span>
          </button>

          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-300 text-slate-800 hover:bg-slate-200 transition-colors">
            <Medal className="w-4 h-4" />
            <span>Matches</span>
          </button>

          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-300 text-slate-800 hover:bg-slate-200 transition-colors">
            <Trophy className="w-4 h-4" />
            <span>Tournaments</span>
          </button>

          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-300 text-slate-800 hover:bg-slate-200 transition-colors">
            <Flame className="w-4 h-4" />
            <span>Training</span>
          </button>

          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-300 text-slate-800 hover:bg-slate-200 transition-colors">
            <Calendar className="w-4 h-4" />
            <span>Events</span>
          </button>
        </div>

        {/* Photo section*/}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

          {/* Row 1: Large Champions Photo (7 cols) */}
          <div className="md:col-span-7 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg1.png"
              alt="Champions Trophy Celebration"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 1: Action Match Shot (5 cols) */}
          <div className="md:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg2.png"
              alt="Match Action Shot"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 2: Left Small Photo (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-64 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg3.png"
              alt="Youth Match Action"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 2: Middle Sunset Huddle Photo (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-64 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/p1.png"
              alt="Team Sunset Huddle"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 2: Right Corner Celebration (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-64 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg5.png"
              alt="Goal Kneeling Celebration"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 3: Wide Fans Banner (7 cols) */}
          <div className="md:col-span-7 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg6.png"
              alt="Crowd & Banner Section"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 3: Player Sitting Pitchside (5 cols) */}
          <div className="md:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg7.png"
              alt="Player Resting at Sunset"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 4: Bottom Left Photo (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-60 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg8.png"
              alt="Stadium Match Action"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 4: Bottom Stadium Wide View (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-60 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg9.png"
              alt="Night Stadium Overview"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Row 4: Bottom Right Celebration (4 cols) */}
          <div className="md:col-span-4 relative h-56 sm:h-60 rounded-2xl overflow-hidden group border border-slate-800">
            <Image
              src="/pg10.png"
              alt="Youth Team Cheering"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

        </div>

        {/*  BOTTOM BANNER */}
        <div className="mt-2 bg-emerald-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-full bg-emerald-200/80 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Have amazing photos from our events?
              </h3>==
              <p className="text-sm font-medium text-slate-600 mt-1">
                Share your moments and be featured on our gallery
              </p>
            </div>
          </div>

          <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors inline-flex items-center gap-2 flex-shrink-0">
            <span>Upload Your Photos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
}