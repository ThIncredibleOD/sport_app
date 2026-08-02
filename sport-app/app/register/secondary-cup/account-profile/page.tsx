"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import Image from "next/image";
import { useRegister } from "@/context/sportContext";

export default function AccountProfile() {
  const { academyProfile, setAcademyProfile } = useRegister();
  const router = useRouter();

  // State for Passport Upload & Preview
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Logo Image Handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAcademyProfile((prev) => ({ ...prev, logo: file }));
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Submitted Profile Data:", academyProfile, logoPreview);

    // Navigate to next step
    router.push("/register/secondary-cup/academy-squad");
  };

  useEffect(() => {
    if (!academyProfile.logo) return;

    const url = URL.createObjectURL(academyProfile.logo);
    setLogoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [academyProfile.logo]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white">
        {/* Back Link */}
        <a
          href="/register"
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </a>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/under1.png"
              height="800"
              width="1200"
              alt="The Nathaniel Idowu Under 16 Football League"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            Account Profile
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
            Please ensure all academy details match your official registration
            documents.
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Upload logo  */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <label className="relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-dashed border-white/30 bg-slate-950/40 cursor-pointer hover:border-[#16a34a] hover:bg-slate-950/60 transition-all overflow-hidden group">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  height="800"
                  width="1600"
                  alt="Logo Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Plus className="h-6 w-6 text-slate-300 group-hover:text-white transition-colors" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-300">Upload Team Logo</span>
          </div>

          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={academyProfile.name}
              onChange={(e) =>
                setAcademyProfile((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Contact Number Field */}
          <div>
            <label
              htmlFor="contactNumber"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Contact Number
            </label>
            <input
              type="number"
              id="contactNumber"
              name="contactNumber"
              value={academyProfile.contactNumber}
              onChange={(e) =>
                setAcademyProfile((prev) => ({
                  ...prev,
                  contactNumber: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Email Address Field */}
          <div>
            <label
              htmlFor="emailAddress"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="emailAddress"
              name="emailAddress"
              value={academyProfile.email}
              onChange={(e) =>
                setAcademyProfile((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Academy Name Field */}
          <div>
            <label
              htmlFor="academyName"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              Academy Name
            </label>
            <input
              type="text"
              id="academyName"
              name="academyName"
              value={academyProfile.academyName}
              onChange={(e) =>
                setAcademyProfile((prev) => ({
                  ...prev,
                  academyName: e.target.value,
                }))
              }
              required
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Submit / Next Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2 px-4 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2 focus:ring-offset-[#0f172a]"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
