"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface EventCardProps {
  title: string;
  date: string;
  description: string;
  imageSrc: string;
  linkHref: string;
}

// Compact Reusable Individual Card Component
function EventCard({
  title,
  date,
  description,
  imageSrc,
  linkHref,
}: EventCardProps) {
  return (
    <div className="group flex flex-col bg-[#0f1d30] border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-700 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative w-full h-[120px] sm:h-[140px] overflow-hidden">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Card Content Details */}
      <div className="flex flex-col flex-grow p-4 items-start">
        {/*Title */}
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug mb-1 line-clamp-2">
          {title}
        </h3>

        {/* Date */}
        <span className="text-[10px] text-slate-400 font-medium mb-1.5">
          {date}
        </span>

        {/*Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        {/* Read More Link */}
        <Link
          href={linkHref}
          className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-green-500 hover:text-green-400 transition-colors group/link"
        >
          Read More
          <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover/link:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// Main Events Section
export default function Events() {
  return (
    <section className="w-full bg-[#0b1727] py-8 md:py-10 text-white">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        {/* Section Heading */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-extrabold tracking-[0.15em] uppercase text-white">
            Latest News & Upcoming Events
          </h2>
        </div>

        {/* Grid Layout for Event Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 md:mb-10">
          {/* Card 1 */}
          <EventCard
            title="Peakline U-13 League Finale Concludes in Style"
            date="May 28 2026"
            description="Exciting matchups and great talent on display."
            imageSrc="/news.png"
            linkHref="#event-1"
          />

          {/* Card 2 */}
          <EventCard
            title="Peakline U-13 League Finale Concludes in Style"
            date="May 28 2026"
            description="Exciting matchups and great talent on display."
            imageSrc="/pillar2.png"
            linkHref="#event-2"
          />

          {/* Card 3 */}
          <EventCard
            title="Peakline U-13 League Finale Concludes in Style"
            date="May 28 2026"
            description="Exciting matchups and great talent on display."
            imageSrc="/pillars.png"
            linkHref="#event-3"
          />

          {/* Card 4 */}
          <EventCard
            title="Peakline U-13 League Finale Concludes in Style"
            date="May 28 2026"
            description="Exciting matchups and great talent on display."
            imageSrc="/pillar3.png"
            linkHref="#event-4"
          />
        </div>

        {/* Compact Bottom Centered "View All" Button */}
        <div className="flex justify-center">
          <Link
            href="#all-events"
            className="inline-flex items-center gap-1.5 border border-slate-700 bg-transparent hover:bg-slate-900/50 hover:border-slate-500 text-white font-semibold text-xs py-2 px-4 rounded-md transition-all duration-300 group"
          >
            View All News & Events
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
