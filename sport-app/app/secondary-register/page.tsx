"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function AccountProfile() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    emailAddress: '',
    academyName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log or handle form data locally
    console.log('Submitted Profile Data:', formData);

    // Navigate to next step...
    router.push('/#');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      {/* Dark Layer */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/*  Modal Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none overflow-hidden">
        
        {/* Back Link to get-started page */}
        <a 
          href="/get-started" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </a>

        {/* Header / Logo Section */}
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <img 
              src="/secondary.png" 
              alt="The Nathaniel Secondary School Cup" 
              className="h-28 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            Account Profile
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
            Please ensure all academy details match your official registration documents.
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700/80 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Contact Number Field */}
          <div>
            <label htmlFor="contactNumber" className="block text-xs font-medium text-slate-300 mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700/80 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Email Address Field */}
          <div>
            <label htmlFor="emailAddress" className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="emailAddress"
              name="emailAddress"
              value={formData.emailAddress}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700/80 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Academy Name Field */}
          <div>
            <label htmlFor="academyName" className="block text-xs font-medium text-slate-300 mb-1">
              Academy Name
            </label>
            <input
              type="text"
              id="academyName"
              name="academyName"
              value={formData.academyName}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700/80 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#16a34a] focus:outline-none focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>

          {/* Next Action Button */}
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