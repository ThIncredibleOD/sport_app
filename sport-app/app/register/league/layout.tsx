"use client";

import {
  AcademyProfile,
  HeadCoach,
  Official,
  Player,
  SportContext,
  createEmptyOfficial,
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
  // Officials besides the head coach. All optional — a team may arrive without
  // an assistant coach or a second medic and still has to be registrable — so
  // they start blank and stay blank unless a name is typed.
  const [teamManager, setTeamManager] = useState<Official>(createEmptyOfficial);
  const [assistantCoach, setAssistantCoach] =
    useState<Official>(createEmptyOfficial);
  const [medics, setMedics] = useState<Official[]>(() => [
    createEmptyOfficial(),
    createEmptyOfficial(),
  ]);
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
        teamManager,
        setTeamManager,
        assistantCoach,
        setAssistantCoach,
        medics,
        setMedics,
        players,
        setPlayers,
      }}
    >
      {children}
    </SportContext.Provider>
  );
}
