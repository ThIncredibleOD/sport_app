"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Award, BookOpen, ShieldCheck, ArrowRight } from 'lucide-react';

interface PillarCardProps {
  title: string;
  description: string;
  bgImage: string;
  icon: React.ReactNode;
  linkHref: string;
}

// Compact Reusable Card Template
function PillarCard({ title, description, bgImage, icon, linkHref }: PillarCardProps) {
  return (
   
    <div className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 min-h-[300px] flex flex-col justify-end p-6 transition-all duration-300 hover:border-green-600/40 hover:shadow-lg hover:shadow-green-950/20">
      
      {/* Background Style Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt={title}
          fill
          className="object-cover opacity-70 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
      </div>

      {/* Card Content*/}
      <div className="relative z-10 flex flex-col items-start">
        
        {/* Shrunk Glowing Green Icon Circle */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full border border-green-500 bg-slate-950/90 text-white mb-4 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold tracking-tight text-white uppercase mb-2 leading-snug">
          {title}
        </h3>

        {/* Description  */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4 max-w-[260px]">
          {description}
        </p>

        {/* Yellow "Learn More" Link */}
        <Link 
          href={linkHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors group/link"
        >
          Learn More
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
        </Link>

      </div>
    </div>
  );
}

// Main Pillars Section
export default function Pillars() {
  return (
    
    <section className="w-full bg-slate-950 py-10 md:py-14 text-white">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        
        {/* Section Header (Slightly more compact margins) */}
        <div className="text-center mb-10 md:mb-12">
          <span className="text-xs font-bold tracking-[0.25em] text-green-500 uppercase block mb-2">
            Our Core Pillars
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight uppercase leading-none">
            Empowering Athletes. Building Futures
          </h2>
        </div>

        {/* Grid of 3 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <PillarCard
            title="Youth Leagues & Championships"
            description="Structured age-grade leagues and tournaments that promote competition, discipline and teamwork."
            bgImage="/pillars.png"
            icon={<Award className="w-5.5 h-5.5 text-white stroke-[1.5]" />}
            linkHref="#leagues"
          />

          {/* Card 2 */}
          <PillarCard
            title="Capacity Building & Education"
            description="Structured age-grade leagues and tournaments that promote competition, discipline and teamwork."
            bgImage="/pillar2.png"
            icon={<BookOpen className="w-5.5 h-5.5 text-white stroke-[1.5]" />}
            linkHref="#education"
          />

          {/* Card 3 */}
          <PillarCard
            title="Player Management & Welfare"
            description="Structured age-grade leagues and tournaments that promote competition, discipline and teamwork."
            bgImage="/pillar3.png"
            icon={<ShieldCheck className="w-5.5 h-5.5 text-white stroke-[1.5]" />}
            linkHref="#welfare"
          />

        </div>

      </div>
    </section>
  );
}