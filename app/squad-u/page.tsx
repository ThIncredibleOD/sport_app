"use client";

import React, { useState } from "react";
import { Calendar, MapPin, Trophy, Check } from "lucide-react";

export default function OfficialSquad() {
  // Team Information
  const [teamInfo] = useState({
    name: "HeroSpace International Academy",
    logo: "/logo2.jpg", 
    subtitle: "Registered Official Tournament Squad",
  });

  // Head Coach Information
  const [headCoach] = useState({
    name: "Coach Emmanuel Babatunde",
    title: "Head Coach",
    age: 42,
    avatar: "/coach-avatar.png", // Replace with your coach photo path
  });

  // Squad Roster Data (18 Players)
  const [squad] = useState([
    { id: 1, name: "Ayomide Balogun", jerseyNo: "1", position: "Goalkeeper", dob: "12 Mar 2009", nationality: "Nigerian", avatar: "/players/p1.png" },
    { id: 2, name: "Daniel Folorunsho", jerseyNo: "24", position: "Goalkeeper", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p2.png" },
    { id: 3, name: "Samuel Ojo", jerseyNo: "4", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p3.png" },
    { id: 4, name: "Emeka Nwosu", jerseyNo: "22", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p4.png" },
    { id: 5, name: "Ibrahim Musa", jerseyNo: "42", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p5.png" },
    { id: 6, name: "Tobi Bakare", jerseyNo: "14", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p6.png" },
    { id: 7, name: "Oluwaseun Adeyemi", jerseyNo: "5", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p7.png" },
    { id: 8, name: "Chinedu Okafor", jerseyNo: "99", position: "Defender", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p8.png" },
    { id: 9, name: "Victor Etim", jerseyNo: "32", position: "Midfielder", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p9.png" },
    { id: 10, name: "David Ibekwe", jerseyNo: "21", position: "Midfielder", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p10.png" },
    { id: 11, name: "Kehinde Olatunji", jerseyNo: "6", position: "Midfielder", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p11.png" },
    { id: 12, name: "Mubarak Hassan", jerseyNo: "4", position: "Midfielder", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p12.png" },
    { id: 13, name: "Femi Peter", jerseyNo: "19", position: "Midfielder", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p13.png" },
    { id: 14, name: "Chukwudi Eze", jerseyNo: "9", position: "Forward", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p14.png" },
    { id: 15, name: "Sadiq Abubakar", jerseyNo: "7", position: "Forward", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p15.png" },
    { id: 16, name: "Emmanuel Udo", jerseyNo: "11", position: "Forward", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p16.png" },
    { id: 17, name: "Temitope Adebayo", jerseyNo: "10", position: "Forward", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p17.png" },
    { id: 18, name: "Kingsley Obinna", jerseyNo: "25", position: "Forward", dob: "31 Jun 2010", nationality: "Nigerian", avatar: "/players/p18.png" },
  ]);

  // Dynamic Tailwind styling helper for Player Positions
  const getPositionBadgeColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case "goalkeeper":
        return "text-amber-400 font-semibold";
      case "defender":
        return "text-green-500 font-semibold";
      case "midfielder":
        return "text-blue-500 font-semibold";
      case "forward":
        return "text-red-400 font-semibold";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 font-sans text-white overflow-x-hidden py-6">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        
        {/*  TOURNAMENT TOP HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <img
              src="/under1.png"
              alt="Nathaniel Idowu Under 16 Football League"
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white drop-shadow">
               The Nathaniel Idowu Under 16 Football League
              </h1>
              
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Dates:TBD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Venues: New Maracana Sport Complex & Nathaniel Idowu Football Pitch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Format: League Phase + Super Four</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Team Logo */}
        <section className="flex flex-col items-center justify-center text-center pt-2">
          <div className="flex items-center justify-center gap-3">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14   p-2 flex items-center justify-center shadow-xl backdrop-blur-md">
              <img
                src="/logo2.jpg"
                alt="Team Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              HeroSpace International Academy
            </h2>
          </div>

          {/* Tournament Details */}
          <p className="mt-1 text-[3px] sm:text-sm text-slate-300  max-w-lg font-medium ">
            Tournament ID: 123456789 
          </p>
        </section>

        {/*  HEAD COACH PROFILE */}
        <section className="flex justify-start">
          <div className="flex items-center gap-3.5 p-3 px-4 rounded-xl bg-slate-900/70 border border-white/15 backdrop-blur-md shadow-lg max-w-xs">
            <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-800 shrink-0">
              <img
                src={headCoach.avatar}
                alt="Head Coach"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">
                Coach Emmy
              </h4>
              <p className="text-[11px] text-emerald-400 font-medium">
               Head Coach
              </p>
              <p className="text-[10px] text-slate-400">
                Age: <span className="text-slate-200 font-semibold">41 yrs</span>
              </p>
            </div>
          </div>
        </section>

           {/* Section Title */}
        <div className="my-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            Official Academy Squad
          </h2>
        </div>

        {/*  SQUAD TABLE SECTION */}
        <section className="space-y-2">
          {/* Header Bar */}
           <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Total Players: <strong className="text-white">18</strong></span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Player Name</th>
                  <th className="py-3 px-4 text-center">Jersey No.</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Date Of Birth</th>
                  <th className="py-3 px-4">Nationality</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {squad.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-800/40 transition-colors duration-150"
                  >
                    {/* Index / Player Avatar */}
                    <td className="py-2.5 px-4 text-center font-medium text-slate-400">
                      <div className="flex items-center justify-center">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="h-7 w-7 rounded-full object-cover border border-white/20 bg-slate-800"
                        />
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {player.name}
                    </td>

                    {/* Jersey No */}
                    <td className="py-2.5 px-4 text-center font-bold text-slate-300">
                      {player.jerseyNo}
                    </td>

                    {/* Position */}
                    <td className={`py-2.5 px-4 ${getPositionBadgeColor(player.position)}`}>
                      {player.position}
                    </td>

                    {/* Date Of Birth */}
                    <td className="py-2.5 px-4 text-slate-300">
                      {player.dob}
                    </td>

                    {/* Nationality */}
                    <td className="py-2.5 px-4 text-slate-300">
                      {player.nationality}
                    </td>

                    {/* Verified Status */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}