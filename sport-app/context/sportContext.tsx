"use client";

import React, { createContext, useContext, useState } from "react";

export type AcademyProfile = {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  academyName: string;
  logo: File | null;
};

export type HeadCoach = {
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
  position: PlayerPosition;
  consentForm: File | null;
  proofOfAge: File | null;
  passportPreview: string | null;
};

type PlayerPosition = "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | "";

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
};

const initialCoach: HeadCoach = {
  id: "",
  passport: null,
  fullName: "",
  dateOfBirth: "",
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
    players: context.players.map((p) => ({
      full_name: p.fullName,
      dob: p.dateOfBirth,
      nationality: p.nationality,
      position: p.position,
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