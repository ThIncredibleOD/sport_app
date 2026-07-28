'use client';

import React from 'react';
import Image from 'next/image';
import { ImageIcon, Volleyball, Trophy, Flame, Calendar, ArrowRight } from 'lucide-react';

export default function ImageGallery() {
  return (
    <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 w-full border-t border-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOP FILTER BUTTONS */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white shadow-md">
            <ImageIcon className="w-4 h-4" />
            <span>All Photos</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-[200] text-slate-800 hover:bg-slate-200 transition-colors">
            <Volleyball className="w-4 h-4" />
            <span>Matches</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-[200] text-slate-800 hover:bg-slate-200 transition-colors">
            <Trophy className="w-4 h-4" />
            <span>Tournaments</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-[200] text-slate-800 hover:bg-slate-200 transition-colors">
            <Flame className="w-4 h-4" />
            <span>Training</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-[200] text-slate-800 hover:bg-slate-200 transition-colors">
            <Calendar className="w-4 h-4" />
            <span>Events</span>
          </button>
        </div>

        {/* PHOTO GRID SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Row 1: Large Champions Photo */}
          <div className="md:col-span-7 relative h-55 sm:h-80 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg1.png" 
              alt="Champions Trophy Celebration" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Champions Trophy Celebration</p>
            </div>
          </div>

          {/* Row 1: Action Match Shot */}
          <div className="md:col-span-5 relative h-55 sm:h-80 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg2.png" 
              alt="Match Action Shot" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Match Action Shot</p>
            </div>
          </div>

          {/* Row 2: Left Small Photo */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg3.png" 
              alt="Youth Team Huddle" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Youth Team Huddle</p>
            </div>
          </div>

          {/* Row 2: Middle Sunset Huddle Photo */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pillar2.png" 
              alt="Goal Celebration" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Goal Celebration</p>
            </div>
          </div>

          {/* Row 2: Right Corner Celebration */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg5.png" 
              alt="Ongoing Match Action" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Ongoing Match Action</p>
            </div>
          </div>

          {/* Row 3: Wide Fans Banner */}
          <div className="md:col-span-7 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg6.png" 
              alt="Crowd & Full Pitch View" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Crowd & Full Pitch View</p>
            </div>
          </div>

          {/* Row 3: Player Sitting Pitchside */}
          <div className="md:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg7.png" 
              alt="Friendly Match Team Action" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Friendly Match Team Action</p>
            </div>
          </div>

          {/* Row 4: Bottom Left Photo */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg8.png" 
              alt="Team Goal Celebration" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Team Goal Celebration</p>
            </div>
          </div>

          {/* Row 4: Bottom Stadium Wide View */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg9.png" 
              alt="Kneeling Team Celebration" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Kneeling Goal Celebration</p>
            </div>
          </div>

          {/* Row 4: Bottom Right Celebration */}
          <div className="md:col-span-4 relative h-55 sm:h-64 rounded-2xl overflow-hidden group border border-slate-900">
            <Image 
              src="/pg10.png" 
              alt="Crowd Cheering" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            {/* Code for dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            {/* Code for text*/}
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <p className="text-sm font-semibold tracking-wide drop-shadow-md">Crowd Cheering</p>
            </div>
          </div>

        </div>

        {/* BOTTOM BANNER */}
        <div className="mt-2 bg-emerald-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-emerald-200/80 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Have amazing photos from our events?
              </h3>
              <p className="text-xs font-medium text-slate-600 mt-1">
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