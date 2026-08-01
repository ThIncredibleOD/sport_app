"use client";

import { createContext, useContext } from "react";

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
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  consentForm: File | null;
  proofOfAge: File | null;
};

type PlayerPosition = "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD";

type RegisterContextType = {
  academyProfile: AcademyProfile;
  setAcademyProfile: React.Dispatch<React.SetStateAction<AcademyProfile>>;

  headCoach: HeadCoach;
  setHeadCoach: React.Dispatch<React.SetStateAction<HeadCoach>>;

  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
};

export const SportContext = createContext<RegisterContextType | null>(null);

export function useRegister() {
  const context = useContext(SportContext);
  if (!context) throw new Error("useUser must be used inside provider");
  return context;
}
