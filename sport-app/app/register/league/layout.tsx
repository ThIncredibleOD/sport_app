"use client";

import {
  AcademyProfile,
  HeadCoach,
  Player,
  SportContext,
  createEmptyPlayer,
} from "@/context/sportContext";
import { useState } from "react";

const PLAYER_COUNT = 18;

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
    teamLogo: undefined,
    contactEmail: "",
    contactPhone: "",
  });
  const [headCoach, setHeadCoach] = useState<HeadCoach>({
    id: crypto.randomUUID(),
    passport: null,
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    dob: "",
  });
  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: PLAYER_COUNT }, () => createEmptyPlayer()),
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
