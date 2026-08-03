"use client";

import React, { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
//helps with the navigation bar and links to different pages in the application
interface NavLink {
  label: string;
  href: string;
}
// Define the navigation links for the navbar
const navLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'News & Updates', href: '/news' },
  { label: 'Photo Gallery', href: '/gallery' },
];


  export default function Navbar() {
    return (
     
     <nav className="bg-slate-900 text-slate-100 md:px-9 shadow-lg border-b border-slate-700">
        <div className="w-full flex justify-between items-center gap-4">

      {/* Logo*/}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/logo.png"       
              alt="Page Logo" 
              width={200}            
              height={80}          
              className="object-contain" 
            />
            
          </Link>
        </div>
            
      {/* Navigation Links */}
        <ul className="flex items-center gap-10 font-medium">
          <li>
            <Link href="/" className=" font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300">
              Home
            </Link>
          </li>
          <li>
            <Link href="/about" className=" text-green-500 font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300">
              About Us
            </Link>
          </li>
          <li>
            <Link href="/news" className="font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300">
              News & Updates
            </Link>
          </li>
           
          <li>
            <Link href="/gallery" className="font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300">
              Photo Gallery
            </Link>
          </li>
        </ul>

        {/*Button*/}
        <div>
          <Link href="/get-started" className="whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-yellow-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-md font-semibold shadow-md transition-all duration-300">
            Register Now
            <ArrowRight className="w-5 h-4 text-white" />
          </Link>
        </div>

    </div>
   </nav>


  );
};