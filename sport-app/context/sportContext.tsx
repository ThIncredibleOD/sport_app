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
  proofOfAge: null,
  passportPreview: null,
});

/**
 * Required-field gaps for a single player, mirroring submitRegistration's hard
 * requirements. A row only counts once it has a name (empty rows are dropped at
 * submit); a named row must carry its proof of age, which is typed `File` and
 * would otherwise make the whole submission throw. This is the single source of
 * truth for the review screen and the submit page's pre-submit guard.
 *
 * The signed parental consent form is deliberately NOT checked here — it is
 * handed over on paper at the registration desk, not uploaded.
 */
export const playerBlockingGaps = (player: Player): string[] => {
  if (!player.fullName.trim()) return [];
  const gaps: string[] = [];
  if (!player.dateOfBirth.trim()) gaps.push("date of birth");
  if (!player.nationality.trim()) gaps.push("nationality");
  if (!player.jerseyNumber.trim()) gaps.push("jersey number");
  if (!player.position.trim()) gaps.push("position");
  if (!player.proofOfAge) gaps.push("proof of age");
  return gaps;
};

/**
 * A team official other than the head coach — team manager, assistant coach or
 * medic.
 *
 * One shared shape rather than a type per role: all of them are captured with
 * the same four fields, so the staff pages, the review screen, the summary PDF
 * and the submit payload can each handle them through a single code path.
 *
 * Deliberately does NOT carry HeadCoach's `dob`, which is an unused duplicate of
 * `dateOfBirth` and only survives there because existing code sets it.
 */
export type Official = {
  id: string;
  passport: File | null;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
};

/** Single source of truth for a blank official, mirroring createEmptyPlayer. */
export const createEmptyOfficial = (): Official => ({
  id: crypto.randomUUID(),
  passport: null,
  fullName: "",
  dateOfBirth: "",
  nationality: "",
});

/**
 * Required-field gaps for one official, mirroring playerBlockingGaps.
 *
 * Officials are optional by design: a team can turn up at the desk without an
 * assistant coach or a second medic and must still be registrable, so an
 * un-named official counts as absent rather than incomplete and reports no gaps.
 * Once a name is typed, that person needs a date of birth and a nationality to
 * be worth storing at all — which is also what the staff form enforces.
 *
 * A photo is never required: officials' passports are nice to have, not a gate.
 */
export const officialBlockingGaps = (official: Official): string[] => {
  if (!official.fullName.trim()) return [];
  const gaps: string[] = [];
  if (!official.dateOfBirth.trim()) gaps.push("date of birth");
  if (!official.nationality.trim()) gaps.push("nationality");
  return gaps;
};

type RegisterContextType = {
  academyProfile: AcademyProfile;
  setAcademyProfile: React.Dispatch<React.SetStateAction<AcademyProfile>>;

  headCoach: HeadCoach;
  setHeadCoach: React.Dispatch<React.SetStateAction<HeadCoach>>;

  teamManager: Official;
  setTeamManager: React.Dispatch<React.SetStateAction<Official>>;

  assistantCoach: Official;
  setAssistantCoach: React.Dispatch<React.SetStateAction<Official>>;

  /** Exactly two entries, so the medics page can render both from one loop. */
  medics: Official[];
  setMedics: React.Dispatch<React.SetStateAction<Official[]>>;

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

// Blank official for the module-level defaults below. Uses an empty id rather
// than crypto.randomUUID() so nothing runs at import time on the server; the
// real ids come from createEmptyOfficial() inside a component.
const initialOfficial: Official = {
  id: "",
  passport: null,
  fullName: "",
  dateOfBirth: "",
  nationality: "",
};

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile>(initialAcademy);
  const [headCoach, setHeadCoach] = useState<HeadCoach>(initialCoach);
  const [teamManager, setTeamManager] = useState<Official>(createEmptyOfficial);
  const [assistantCoach, setAssistantCoach] = useState<Official>(createEmptyOfficial);
  const [medics, setMedics] = useState<Official[]>(() => [
    createEmptyOfficial(),
    createEmptyOfficial(),
  ]);
  const [players, setPlayers] = useState<Player[]>([]);

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

export function useRegister() {
  const context = useContext(SportContext);

  // Safe fallback for SSR / Next.js static prerendering when Provider isn't mounted yet
  if (!context) {
    return {
      academyProfile: initialAcademy,
      setAcademyProfile: () => {},
      headCoach: initialCoach,
      setHeadCoach: () => {},
      teamManager: initialOfficial,
      setTeamManager: () => {},
      assistantCoach: initialOfficial,
      setAssistantCoach: () => {},
      medics: [initialOfficial, initialOfficial],
      setMedics: () => {},
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
      proof_of_age: p.proofOfAge as File,
    })),
  };

  const resetForm = () => {
    context.setAcademyProfile(initialAcademy);
    context.setHeadCoach(initialCoach);
    context.setTeamManager(createEmptyOfficial());
    context.setAssistantCoach(createEmptyOfficial());
    context.setMedics([createEmptyOfficial(), createEmptyOfficial()]);
    context.setPlayers([]);
  };

  return {
    ...context,
    formData,
    resetForm,
  };
}

export const useRegistrationForm = useRegister;