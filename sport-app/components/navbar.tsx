"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, House, ArrowRight, Info, Newspaper, Images } from "lucide-react";
import { useState, useEffect } from "react";
//helps with the navigation bar and links to different pages in the application
interface NavLink {
  label: string;
  href: string;
}
// Define the navigation links for the navbar
const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "News & Updates", href: "/news" },
  { label: "Photo Gallery", href: "/gallery" },
];

export default function Navbar() {
  const [dropdown, setDropdown] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setDropdown(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <nav className="bg-slate-900 text-slate-100 px-2 shadow-lg border-b border-slate-700">
      <div className="w-full flex justify-between items-center gap-4">
        <div className="relative flex items-center gap-2">
          {dropdown && (
            <ul className="bg-slate-900 absolute top-[calc(100%+10px)] z-100 p-2 rounded-md flex flex-col gap-2">
              <li>
                <Link
                  href="/"
                  className="flex text-green-400 items-center gap-2 p-2 whitespace-nowrap hover:bg-slate-500 rounded-sm cursor-pointer"
                >
                  <House size={20} />
                  Home
                </Link>
              </li>

              <hr className="border-gray-500" />

              <li>
                <Link
                  href="/about"
                  className="flex items-center gap-2 p-2 whitespace-nowrap hover:bg-slate-500 rounded-sm cursor-pointer"
                >
                  <Info size={20} />
                  About Us
                </Link>
              </li>

              <hr className="border-gray-500" />

              <li>
                <Link
                  href="/news"
                  className="flex items-center gap-2 p-2 whitespace-nowrap hover:bg-slate-500 rounded-sm cursor-pointer"
                >
                  <Newspaper size={20} />
                  News & Updates
                </Link>
              </li>

              <hr className="border-gray-500" />

              <li>
                <Link
                  href="/gallery"
                  className="flex items-center gap-2 p-2 whitespace-nowrap hover:bg-slate-500 rounded-sm cursor-pointer"
                >
                  <Images size={20} />
                  Photo Gallery
                </Link>
              </li>
            </ul>
          )}

          <div
            className="md:hidden cursor-pointer"
            role="button"
            onClick={() => setDropdown((prev) => !prev)}
          >
            <Menu />
          </div>
          {/* Logo*/}
          <div className="flex items-center">
            <Link href="/" className="flex items-center ">
              <Image
                src="/logo.png"
                alt="Page Logo"
                width={200}
                height={200}
                className="object-contain w-24 md:w-28 lg:w-36 xl:w-40"
              />
            </Link>
          </div>
        </div>

        {/* Navigation Links */}
        <ul className="hidden md:flex items-center gap-10 font-medium">
          <li>
            <Link
              href="/"
              className="text-green-500 font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 hover:text-yellow-400 transition-colors duration-300"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300"
            >
              About Us
            </Link>
          </li>
          <li>
            <Link
              href="/news"
              className="font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300"
            >
              News & Updates
            </Link>
          </li>

          <li>
            <Link
              href="/gallery"
              className="font-medium px-4 py-2 rounded-lg hover:bg-slate-100/10 transition-colors duration-300"
            >
              Photo Gallery
            </Link>
          </li>
        </ul>

        {/*Button*/}
        <div>
          <Link
            href="/register"
            className="whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-yellow-600 hover:to-amber-700 text-white px-4 py-1 md:py-2 rounded-md font-semibold shadow-md transition-all duration-300"
          >
            Register
            <ArrowRight className="hidden md:block text-white" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
