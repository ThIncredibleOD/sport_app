"use client";

import {
  AcademyProfile,
  HeadCoach,
  Player,
  SportContext,
} from "@/context/sportContext";
import { useState } from "react";

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

export default function LeagueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile>({
    id: crypto.randomUUID(),
    name: "",
    contactNumber: "",
    email: "",
    academyName: "",
    logo: null,
  });
  const [headCoach, setHeadCoach] = useState<HeadCoach>({
    id: crypto.randomUUID(),
    passport: null,
    fullName: "",
    dateOfBirth: "",
    nationality: "",
  });
  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: 18 }, () => createEmptyPlayer()),
  );

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
