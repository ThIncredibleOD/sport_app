"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Plus, 
  Upload, 
  AlertTriangle, 
  RotateCcw 
} from 'lucide-react';

interface Player {
  playerFullName: string;
  dateOfBirth: string;
  StateOfOrigin: string;
  nationality: string;
  jerseyNumber: string;
  position: string;
  passport: File | null;
  passportPreview: string | null;
  consentForm: File | null;
  proofOfAge: File | null;
}

const createEmptyPlayer = (): Player => ({
  playerFullName: '',
  dateOfBirth: '',
  StateOfOrigin: '',
  nationality: '',
  jerseyNumber: '',
  position: '',
  passport: null,
  passportPreview: null,
  consentForm: null,
  proofOfAge: null,
});

export default function PlayerRegistration() {
  const router = useRouter();

  // Array of 18 player objects
  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: 18 }, () => createEmptyPlayer())
  );
  
  // Track active player index (0 to 17)
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentPlayer = players[currentIndex];

  const handlePrevPlayer = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleNextPlayer = () => {
    if (currentIndex < players.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handleClearPlayer = () => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = createEmptyPlayer();
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPlayers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], [name]: value };
      return updated;
    });
  };

  const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setPlayers((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], passport: file, passportPreview: previewUrl };
        return updated;
      });
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'consentForm' | 'proofOfAge'
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPlayers((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], [field]: file };
        return updated;
      });
    }
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentIndex < 17) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleNextSection = () => {
    console.log("All 18 players registered:", players);
    router.push('/s-complete'); 
  };

  const handleBottomBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      router.push('/secondary-registration');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-10">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/hero.png')` }}
      />
      <div className="absolute inset-0 bg-slate-950/50" />

      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/20 bg-slate-900/40 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white">
        
        {/* Top Back Link */}
        <div className="w-full flex justify-start relative z-10 mb-2">
          <button 
            type="button"
            onClick={() => router.push('/secondary-registration')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Logo Banner & Number Indicator */}
        <div className="flex flex-col items-center relative z-10">
          <img 
            src="/secondary.png" 
            alt="The Nathaniel Idowu Secondary Football League" 
            className="h-20 w-auto object-contain mb-1"
          />

          {/* PLAYER PAGE NUMBER BADGE (1-18) */}
          <span className="inline-flex items-center rounded-full bg-white/20 border border-[#16a34a]/40 px-3 py-0.5 text-xs font-semibold text-slate-400">
            Player {currentIndex + 1} of 18
          </span>
        </div>

        {/* Top Navigation Controls */}
        <div className="flex items-center justify-between w-full relative z-10 my-3 px-1">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handlePrevPlayer}
              disabled={currentIndex === 0}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-slate-950/40 text-slate-300 transition-all ${
                currentIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-950/70 hover:text-white'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button 
              type="button"
              onClick={handleNextPlayer}
              disabled={currentIndex === 17}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-slate-950/40 text-slate-300 transition-all ${
                currentIndex === 17 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-950/70 hover:text-white'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button 
            type="button"
            onClick={handleClearPlayer}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-900/50 transition-all"
            title="Clear Current Player Input"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Fields */}
        <form className="mt-4 space-y-3.5 relative z-10" onSubmit={handleAddPlayerSubmit}>
          
          {/* Passport Upload */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <label className="relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-dashed border-white/30 bg-slate-950/40 cursor-pointer hover:border-[#16a34a] transition-all overflow-hidden group">
              {currentPlayer.passportPreview ? (
                <img src={currentPlayer.passportPreview} alt="Passport Preview" className="w-full h-full object-cover" />
              ) : (
                <Plus className="h-6 w-6 text-slate-300 group-hover:text-white" />
              )}
              <input type="file" accept="image/*" onChange={handlePassportChange} className="hidden" />
            </label>
            <span className="text-xs text-slate-300">Upload Passport</span>
          </div>

          {/* Player Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">Player Full Name</label>
            <input
              type="text"
              name="playerFullName"
              value={currentPlayer.playerFullName}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none transition-all"
            />
          </div>

          {/* Date Of Birth */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">Date Of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={currentPlayer.dateOfBirth}
              onChange={handleChange}
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white focus:border-[#16a34a] focus:outline-none transition-all [color-scheme:dark]"
            />
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">Nationality</label>
            <input
              type="text"
              name="Nationality"
              value={currentPlayer.nationality}
              onChange={handleChange}
              placeholder="e.g. Nigerian"
              className="w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#16a34a] focus:outline-none transition-all"
            />
          </div>

          {/*  Jersey No. (1 - 99) */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">Jersey No.</label>
            <select
              name="jerseyNumber"
              value={currentPlayer.jerseyNumber}
              onChange={handleChange}
              className="w-full rounded-md border border-white/15 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-[#16a34a] focus:outline-none transition-all"
            >
              <option value="" disabled>Select Jersey Number</option>
              {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          {/* Position Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">Position</label>
            <select
              name="position"
              value={currentPlayer.position}
              onChange={handleChange}
              className="w-full rounded-md border border-white/15 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-[#16a34a] focus:outline-none transition-all"
            >
              <option value="" disabled>Select Player Position</option>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Forward">Forward</option>
            </select>
          </div>

          {/* Warning */}
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>file must be signed by their parent/guardian.</span>
          </div>

          {/* Document Uploads */}
          <div className="space-y-2 pt-1">
            <label className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] py-2 px-4 text-xs font-semibold text-slate-950 cursor-pointer shadow-md transition-all">
              <Upload className="h-3.5 w-3.5" />
              <span>{currentPlayer.consentForm ? currentPlayer.consentForm.name : "Upload Consent Form"}</span>
              <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'consentForm')} className="hidden" />
            </label>

            <label className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] py-2 px-4 text-xs font-semibold text-slate-950 cursor-pointer shadow-md transition-all">
              <Upload className="h-3.5 w-3.5" />
              <span>{currentPlayer.proofOfAge ? currentPlayer.proofOfAge.name : "Upload Proof Of Age"}</span>
              <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'proofOfAge')} className="hidden" />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2">
            <button
              type={currentIndex === 17 ? "button" : "submit"}
              onClick={currentIndex === 17 ? handleNextSection : undefined}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#16a34a] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#15803d] transition-all shadow-lg shadow-emerald-950/50"
            >
              {currentIndex === 17 ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{currentIndex === 17 ? "Next" : "Add Player"}</span>
            </button>

            <button
              type="button"
              onClick={handleBottomBack}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/15 bg-slate-950/60 py-2 px-4 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}