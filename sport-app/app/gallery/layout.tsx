import React from "react";
import "../globals.css";
import Navbar from "../../components/navbar";

export const metadata = {
  title: "Photo gallery - Peakline Sports World",
  description: "Capturing passion and celebrating impacts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-grow w-full flex flex-col">{children}</main>
    </div>
  );
}
