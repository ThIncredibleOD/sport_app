"use client";

import React, { createContext, useContext, useState } from "react";

export type AcademyProfile = {
  teamLogo: undefined;
  contactEmail: string;
  contactPhone: string;
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  academyName: string;
  logo: File | null;
};

export type HeadCoach = {
  dob: string;
  id: string;
  passport: File | null;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
};

export type Player = {
  id: string;
  passport: File | null;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  jerseyNumber: string;
  position: string;
  consentForm: File | null;
  proofOfAge: File | null;
  passportPreview: string | null;
};

/**
 * Single source of truth for a blank player row. Every flow (league, unity,
 * secondary) seeds its carousel from this, so field names stay consistent
 * across the whole registration/review/PDF pipeline.
 */
export const createEmptyPlayer = (): Player => ({
  id: crypto.randomUUID(),
  passport: null,
  fullName: "",
  dateOfBirth: "",
  nationality: "",
  jerseyNumber: "",
  position: "",
  consentForm: null,
  proofOfAge: null,
  passportPreview: null,
});

/**
 * Required-field gaps for a single player, mirroring submitRegistration's
 * hard requirements. A row only counts once it has a name (empty rows are
 * dropped at submit); a named row must carry its consent form and proof of
 * age — both are typed `File` and validated server-side, so a missing one
 * makes the whole (already-paid) submission throw. This is the single source
 * of truth for the review screen and the payment page's pre-submit guard.
 */
export const playerBlockingGaps = (player: Player): string[] => {
  if (!player.fullName.trim()) return [];
  const gaps: string[] = [];
  if (!player.dateOfBirth.trim()) gaps.push("date of birth");
  if (!player.nationality.trim()) gaps.push("nationality");
  if (!player.jerseyNumber.trim()) gaps.push("jersey number");
  if (!player.position.trim()) gaps.push("position");
  if (!player.consentForm) gaps.push("consent form");
  if (!player.proofOfAge) gaps.push("proof of age");
  return gaps;
};

type RegisterContextType = {
  academyProfile: AcademyProfile;
  setAcademyProfile: React.Dispatch<React.SetStateAction<AcademyProfile>>;

  headCoach: HeadCoach;
  setHeadCoach: React.Dispatch<React.SetStateAction<HeadCoach>>;

  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
};

export const SportContext = createContext<RegisterContextType | null>(null);

const initialAcademy: AcademyProfile = {
  id: "",
  name: "",
  contactNumber: "",
  email: "",
  academyName: "",
  logo: null,
  teamLogo: undefined,
  contactEmail: "",
  contactPhone: ""
};

const initialCoach: HeadCoach = {
  id: "",
  passport: null,
  fullName: "",
  dateOfBirth: "",
  dob: "",
  nationality: "",
};

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile>(initialAcademy);
  const [headCoach, setHeadCoach] = useState<HeadCoach>(initialCoach);
  const [players, setPlayers] = useState<Player[]>([]);

  return (
    <SportContext.Provider
      value={{
        academyProfile,
        setAcademyProfile,
        headCoach,
        setHeadCoach,
        players,
        setPlayers,
      }}
    >
      {children}
    </SportContext.Provider>
  );
}

export function useRegister() {
  const context = useContext(SportContext);

  // Safe fallback for SSR / Next.js static prerendering when Provider isn't mounted yet
  if (!context) {
    return {
      academyProfile: initialAcademy,
      setAcademyProfile: () => {},
      headCoach: initialCoach,
      setHeadCoach: () => {},
      players: [],
      setPlayers: () => {},
      formData: {
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        academy_name: "",
        team_logo: null as unknown as File,
        coach_full_name: "",
        coach_dob: "",
        coach_nationality: "",
        coach_photo: null as File | null,
        players: [],
      },
      resetForm: () => {},
    };
  }

  // Format context properties into 'formData' expected by submitRegistration
  const formData = {
    contact_name: context.academyProfile.name,
    contact_phone: context.academyProfile.contactNumber,
    contact_email: context.academyProfile.email,
    academy_name: context.academyProfile.academyName,
    team_logo: context.academyProfile.logo as File,
    coach_full_name: context.headCoach.fullName,
    coach_dob: context.headCoach.dateOfBirth,
    coach_nationality: context.headCoach.nationality,
    coach_photo: context.headCoach.passport,
    players: context.players.map((p) => ({
      full_name: p.fullName,
      dob: p.dateOfBirth,
      nationality: p.nationality,
      position: p.position,
      photo: p.passport,
      consent_form: p.consentForm as File,
      proof_of_age: p.proofOfAge as File,
    })),
  };

  const resetForm = () => {
    context.setAcademyProfile(initialAcademy);
    context.setHeadCoach(initialCoach);
    context.setPlayers([]);
  };

  return {
    ...context,
    formData,
    resetForm,
  };
}

export const useRegistrationForm = useRegister;