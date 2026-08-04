import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Peakline Sports",
  description:
    "A comprehensive football tournament registration platform that simplifies team registration, player enrollment, fixture management, and competition administration.",
  icons: {
    icon: "/favicon.jpeg",
    apple: "/favicon.jpeg", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
          <Navbar />

          {children}
        </div>
      </body>
    </html>
  );
}