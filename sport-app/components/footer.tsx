"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0b1727] text-white py-10 md:py-12 border-t border-slate-800">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        
        {/* Footer Layout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 items-start">
          
          {/* Column 1: Brand & Socials */}
          <div className="flex flex-col gap-4 lg:pr-8">
            <div className="relative w-[180px] h-[55px]">
              <Image
                src="/logo.png"
                alt="Peakline Sports Logo"
                fill
                className="object-contain"
              />
            </div>
            
            {/* Social Icons Inline SVGs */}
            <div className="flex items-center gap-3 mt-2">
              {/* Facebook */}
              <Link href="https://www.facebook.com/share/1DiQq4A37B/" aria-label="Facebook" className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 hover:border-green-500 hover:text-green-500 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
              </Link>
              {/* X / Twitter */}
              <Link href="#" aria-label="X" className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 hover:border-green-500 hover:text-green-500 transition-colors">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </Link>
              {/* Instagram */}
              <Link href="https://www.instagram.com/peakline_sports?igsh=bHM0ajB4MHZ5c2g0&utm_source=qr" aria-label="Instagram" className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 hover:border-green-500 hover:text-green-500 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </Link>
              {/* YouTube */}
              <Link href="https://www.youtube.com/@PeaklineSportsWorldLimited" aria-label="YouTube" className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 hover:border-green-500 hover:text-green-500 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </Link>
            </div>
          </div>

          {/* Column 2: Quick Links (First drawn divider line) */}
          <div className="lg:border-l lg:border-slate-700 lg:pl-10 flex flex-col gap-3 w-full">
            <h4 className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">Home</Link>
              <Link href="/about" className="text-sm text-slate-300 hover:text-white transition-colors">About Us</Link>
              <Link href="/news" className="text-sm text-slate-300 hover:text-white transition-colors">News Update</Link>
              <Link href="/gallery" className="text-sm text-slate-300 hover:text-white transition-colors">Photo Gallery</Link>
            </nav>
          </div>

          {/* Column 3: Contact Us (Second drawn divider line) */}
          <div className="lg:border-l lg:border-slate-700 lg:pl-10 flex flex-col gap-3 w-full">
            <h4 className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">
              Contact Us
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
                  Lagos, Nigeria.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-300 font-semibold">+234 704 649 7313</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-300 font-semibold">Info@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Column 4: Our Mission (Clean alignment spacing) */}
          <div className="lg:pl-10 flex flex-col gap-3 w-full">
            <h4 className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">
              Our Mission
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold max-w-xs">
           To elevate youth sports development by identifying talented athletes, promoting unity and education, building better facilities and coaching capacity, 
           and connecting players to professional and academic opportunities.
            </p>
          </div>

        </div>

      </div>
    </footer>
  );
}