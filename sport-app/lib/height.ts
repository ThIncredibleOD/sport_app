/**
 * Height conversion for player records.
 *
 * Height is typed and stored in centimetres — one number entered, one number in
 * the database. Feet and inches are derived for display only, so the two can
 * never disagree, and there is no second field for someone to fill in wrongly.
 *
 * Every function takes the raw string straight off the form or out of the
 * database (the column is TEXT, like jersey_number) and returns null for
 * anything that isn't a usable height. Callers render nothing on null, which is
 * what keeps the league and secondary-cup surfaces — where these are always
 * blank — looking exactly as they did before this existed.
 */

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** Lower/upper bounds for a plausible human height, in centimetres. */
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;

/**
 * The centimetre value as a number, or null if it isn't one we'd store.
 *
 * Rejects blanks, non-numeric text and out-of-range values alike, so a caller
 * gets a single "is this a height" answer rather than having to re-check.
 */
export function parseHeightCm(value: string | null | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;

  const cm = Number(trimmed);
  if (cm < MIN_HEIGHT_CM || cm > MAX_HEIGHT_CM) return null;
  return cm;
}

/**
 * Centimetres as feet and inches: "175" -> `5'9"`.
 *
 * Rounds to the nearest inch, and carries 12" up to the next foot — without
 * that, 183cm rounds to 71.99" and would render as 5'12".
 */
export function cmToFeetInches(value: string | null | undefined): string | null {
  const cm = parseHeightCm(value);
  if (cm === null) return null;

  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return `${feet}'${inches}"`;
}

/** Both units for a display surface: "175 cm · 5'9\"". */
export function formatHeight(value: string | null | undefined): string | null {
  const cm = parseHeightCm(value);
  if (cm === null) return null;
  return `${cm} cm · ${cmToFeetInches(value)}`;
}

/** The values Preferred Foot accepts. Order is the order the dropdown shows. */
export const PREFERRED_FOOT_OPTIONS = ["Left", "Right", "Both"] as const;

export type PreferredFoot = (typeof PREFERRED_FOOT_OPTIONS)[number];

/** True for a blank value or one of the three allowed feet. */
export function isValidPreferredFoot(value: string): boolean {
  return (
    value.trim() === "" ||
    (PREFERRED_FOOT_OPTIONS as readonly string[]).includes(value.trim())
  );
}
