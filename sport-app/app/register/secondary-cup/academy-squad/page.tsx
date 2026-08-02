"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useRegister } from "@/context/sportContext";
import Image from "next/image";

export default function AcademySquadRegistration() {
  const { headCoach, setHeadCoach } = useRegister();
  const router = useRouter();

  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHeadCoach((prev) => ({ ...prev, passport: file }));
      setPassportPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Log or handle squad data locally
    console.log("Submitted Squad Registration:", {
      headCoach,
      passportPreview,
    });

    // Navigate to the next step
    router.push("/register/secondary-cup/players");
  };

  useEffect(() => {
    if (!headCoach.passport) return;

    const url = URL.createObjectURL(headCoach.passport);
    setPassportPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [headCoach.passport]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark  Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden">
        {/* Back Link to Previous Page */}
        <button
          type="button"
          onClick={() => router.push("/register/secondary-cup/account-profile")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4 relative z-10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center text-center relative z-10">
          {/* League Logo */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/under1.png"
              height="800"
              width="1200"
              alt="The Nathaniel Idowu Under 16 Football League"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white uppercase drop-shadow-sm leading-tight">
            Academy Squad Registration
          </h1>
          <p className="mt-1.5 text-xs text-slate-300 max-w-xs leading-relaxed">
            Enter the details for each player/ head coach and upload their
            required documents. You must register a minimum of 18 players and an
            head coach.
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-6 space-y-4 relative z-10" onSubmit={handleSubmit}>
          {/* Upload Passport Section */}
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <label className="relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-dashed border-white/30 bg-slate-950/40 backdrop-blur-sm cursor-pointer hover:border-[#16a34a] hover:bg-slate-950/60 transition-all overflow-hidden group">
              {passportPreview ? (
                <Image
                  src={passportPreview}
                  height="800"
                  width="1600"
                  alt="Passport Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 group-hover:text-white">
                  <Plus className="h-6 w-6 stroke-[1.5]" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <span className="text-xs font-medium text-slate-300 text-center">
              Upload Passport
            </span>
          </div>
          {/* Head Coach Full Name */}
          <div>
            <label
              htmlFor="headCoachFullName"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Head Coach Full Name
            </label>
            <input
              type="text"
              id="headCoachFullName"
              name="headCoachFullName"
              value={headCoach.fullName}
              onChange={(e) =>
                setHeadCoach((prev) => ({
                  ...prev,
                  fullName: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 backdrop-blur-sm px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:bg-slate-950/60 focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Date Of Birth */}
          <div>
            <label
              htmlFor="dateOfBirth"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Date Of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={headCoach.dateOfBirth}
              onChange={(e) =>
                setHeadCoach((prev) => ({
                  ...prev,
                  dateOfBirth: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 backdrop-blur-sm px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:bg-slate-950/60 focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all [color-scheme:dark]"
            />
          </div>

          {/* Nationality */}
          <div>
            <label
              htmlFor="nationality"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Nationality
            </label>
            <input
              type="text"
              id="nationality"
              name="nationality"
              value={headCoach.nationality}
              onChange={(e) =>
                setHeadCoach((prev) => ({
                  ...prev,
                  nationality: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 backdrop-blur-sm px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:bg-slate-950/60 focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Continue Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2 px-4 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#15803d] shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 focus:ring-offset-[#0f172a]"
            >
              <span>Continue to Players</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
