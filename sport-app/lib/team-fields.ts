/**
 * What a logged-in team may change about itself, and how.
 *
 * THE RULE: anything that establishes WHO A PLAYER IS goes to the organiser for
 * approval. Everything else applies at once.
 *
 * This is an age-restricted tournament, and proof of age is the thing it turns
 * on. A team that can silently edit a date of birth, a player's name, or swap
 * the proof-of-age document can field an over-age player after being approved,
 * which would make the eligibility check meaningless. Photos carry no such
 * risk: a wrong photo is an inconvenience, and being able to fix one without
 * waiting is most of why this portal exists.
 *
 * contact_phone is queued despite not being an identity field, because it is
 * half of the login credential (reference + phone). An instant change would let
 * anyone who got into a session move the account to a phone of their choosing,
 * locking the real team out — so it gets a human look.
 *
 * Both /api/team/* and /api/admin/* import these tables. Neither route decides
 * for itself what is editable: a field that is not listed here cannot be
 * touched through the portal at all, so the default for anything added to the
 * schema later is "not editable", which is the safe direction.
 */

/** Registration-level fields a team may change, applied immediately. */
export const INSTANT_REGISTRATION_FIELDS = [
  "contact_name",
  "contact_email",
] as const;

/** Player-level fields a team may change, applied immediately. */
export const INSTANT_PLAYER_FIELDS = ["jersey_number", "position"] as const;

/** Registration-level fields that need the organiser's approval. */
export const APPROVAL_REGISTRATION_FIELDS = [
  "contact_phone",
  "academy_name",
  "coach_full_name",
  "coach_dob",
  "coach_nationality",
  "manager_full_name",
  "manager_dob",
  "manager_nationality",
  "assistant_coach_full_name",
  "assistant_coach_dob",
  "assistant_coach_nationality",
  "medic1_full_name",
  "medic1_dob",
  "medic1_nationality",
  "medic2_full_name",
  "medic2_dob",
  "medic2_nationality",
] as const;

/** Player-level fields that need the organiser's approval. */
export const APPROVAL_PLAYER_FIELDS = [
  "full_name",
  "dob",
  "nationality",
  // Handled as a file upload, not a typed value: the queued row's new_value
  // holds the storage path of the replacement document.
  "proof_of_age_path",
] as const;

export type InstantRegistrationField = (typeof INSTANT_REGISTRATION_FIELDS)[number];
export type InstantPlayerField = (typeof INSTANT_PLAYER_FIELDS)[number];
export type ApprovalRegistrationField = (typeof APPROVAL_REGISTRATION_FIELDS)[number];
export type ApprovalPlayerField = (typeof APPROVAL_PLAYER_FIELDS)[number];

/** Columns holding a `date`, which reject "" and must be sent as NULL. */
const DATE_FIELDS = new Set<string>([
  "dob",
  "coach_dob",
  "manager_dob",
  "assistant_coach_dob",
  "medic1_dob",
  "medic2_dob",
]);

export function isDateField(field: string): boolean {
  return DATE_FIELDS.has(field);
}

/**
 * Postgres `date` columns reject an empty string outright, so a cleared date
 * has to be written as NULL. Same helper idea as `dateOrNull` in the
 * registration submit path — the failure it prevents is identical.
 */
export function dateOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function isInstantRegistrationField(
  field: string,
): field is InstantRegistrationField {
  return (INSTANT_REGISTRATION_FIELDS as readonly string[]).includes(field);
}

export function isInstantPlayerField(field: string): field is InstantPlayerField {
  return (INSTANT_PLAYER_FIELDS as readonly string[]).includes(field);
}

export function isApprovalRegistrationField(
  field: string,
): field is ApprovalRegistrationField {
  return (APPROVAL_REGISTRATION_FIELDS as readonly string[]).includes(field);
}

export function isApprovalPlayerField(
  field: string,
): field is ApprovalPlayerField {
  return (APPROVAL_PLAYER_FIELDS as readonly string[]).includes(field);
}

/** Human label for the admin queue and the rejection note shown to a team. */
export const FIELD_LABELS: Record<string, string> = {
  contact_name: "Contact name",
  contact_email: "Contact email",
  contact_phone: "Contact phone",
  academy_name: "Academy name",
  jersey_number: "Jersey number",
  position: "Position",
  full_name: "Player name",
  dob: "Date of birth",
  nationality: "Nationality",
  proof_of_age_path: "Proof of age document",
  coach_full_name: "Head coach name",
  coach_dob: "Head coach date of birth",
  coach_nationality: "Head coach nationality",
  manager_full_name: "Team manager name",
  manager_dob: "Team manager date of birth",
  manager_nationality: "Team manager nationality",
  assistant_coach_full_name: "Assistant coach name",
  assistant_coach_dob: "Assistant coach date of birth",
  assistant_coach_nationality: "Assistant coach nationality",
  medic1_full_name: "Medic 1 name",
  medic1_dob: "Medic 1 date of birth",
  medic1_nationality: "Medic 1 nationality",
  medic2_full_name: "Medic 2 name",
  medic2_dob: "Medic 2 date of birth",
  medic2_nationality: "Medic 2 nationality",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}
