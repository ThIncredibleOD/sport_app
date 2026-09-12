/**
 * The three tournaments, and which of them still accept new entries.
 *
 * HOW TO OPEN OR CLOSE A TOURNAMENT
 * Flip `registrationOpen` below, then commit and push (Vercel redeploys on
 * push). That one edit closes every route into the flow at once — the button on
 * /register, every step page including a bookmarked deep link, and the submit
 * call itself. There is nothing else in the app to change.
 *
 * DO THE DATABASE HALF TOO, for a closure that matters. `registrationOpen` is
 * an app-level gate: it stops every path a browser can take, which is every
 * path a team will ever take. It does not stop something talking to Supabase
 * directly with the anon key, because that key ships in the client bundle and
 * is public by design. The matching hard gate is the `tournaments`
 * `registration_open` column and the INSERT policy that reads it — see the
 * "REGISTRATION WINDOW" block in SUPABASE_MIGRATION.sql. Run that in the
 * Supabase SQL editor and the database itself refuses the row.
 *
 * WHY THE FLAG IS HERE AND NOT READ FROM THAT COLUMN: the submit path must not
 * gain a new way to fail. If this code selected `registration_open` and the
 * migration had not been run yet, PostgREST would answer "column does not
 * exist" and EVERY registration in EVERY tournament would break. So the two
 * gates are deliberately independent, and closing a tournament properly is two
 * edits in two places. Both are listed above.
 *
 * `slug` MUST match the `slug` column in the `tournaments` table — it is what
 * resolves a registration to its tournament. The canonical three are
 * u16-league, secondary-cup and unity-cup; the U16 one is NOT "u16-cup" or
 * "under-16", and a mismatch fails the submission at its first query.
 */

/** The URL segment under /register/ — note the U16 flow is `league`. */
export type FlowSegment = "league" | "secondary-cup" | "unity-cup";

export type Tournament = {
  flow: FlowSegment;
  /** Matches `tournaments.slug` in the database. */
  slug: string;
  /** Short name, used on the tournament picker. */
  name: string;
  /** Full name, used under it. */
  subtitle: string;
  logo: string;
  /** false = no new entries. Existing registrations are untouched. */
  registrationOpen: boolean;
  /**
   * How many players a squad may hold in this tournament.
   *
   * Two things read it, and they must not be able to disagree: the registration
   * flow builds this many blank player forms, and the team portal refuses to add
   * a player past it. It lives here rather than in each layout so the server can
   * see it at all — a limit only the browser knows is not a limit.
   */
  playerCount: number;
};

export const TOURNAMENTS: Tournament[] = [
  {
    flow: "league",
    slug: "u16-league",
    name: "The U16 Football League",
    subtitle: "The Nathaniel Idowu U16 Football Cup",
    logo: "/under1.png",
    // CLOSED — entries for the U16 league are complete. Teams already
    // registered keep their entry; this only refuses new ones. A team that IS
    // registered can still add players up to playerCount through the portal:
    // this flag is about new teams, not about a squad fixing its own roster.
    registrationOpen: false,
    playerCount: 25,
  },
  {
    flow: "secondary-cup",
    slug: "secondary-cup",
    name: "All Secondary School Cup",
    subtitle: "The Nathaniel Idowu 7s Football League",
    logo: "/secondary.png",
    registrationOpen: true,
    playerCount: 18,
  },
  {
    flow: "unity-cup",
    slug: "unity-cup",
    name: "Unity Cup",
    subtitle: "The Nathaniel Idowu Unity Cup",
    logo: "/unity.png",
    registrationOpen: true,
    playerCount: 20,
  },
];

export function tournamentByFlow(flow: FlowSegment): Tournament {
  const found = TOURNAMENTS.find((t) => t.flow === flow);
  // Unreachable while FlowSegment and TOURNAMENTS agree, which the type system
  // does not enforce across the two. Throwing beats returning undefined and
  // having a page read `.registrationOpen` off it — that would read as "open".
  if (!found) throw new Error(`No tournament for flow "${flow}".`);
  return found;
}

/**
 * Whether a slug may still be registered into.
 *
 * An UNKNOWN slug is closed, not open. This is the last check before a
 * submission starts writing files, so it fails safe: a typo in a slug stops the
 * submission here with a clear message rather than sailing past the gate.
 */
export function isRegistrationOpen(slug: string): boolean {
  return TOURNAMENTS.some((t) => t.slug === slug && t.registrationOpen);
}

/**
 * How many players a squad in this tournament may hold.
 *
 * An UNKNOWN slug returns 0, for the same reason isRegistrationOpen treats one
 * as closed: this is the number the add-player route compares a roster against,
 * so a slug it cannot resolve has to refuse the addition rather than wave it
 * through. 0 means "no room", which is the safe direction.
 *
 * Deliberately NOT gated on registrationOpen. Closing a tournament stops new
 * TEAMS entering; a team already registered can still complete its own squad.
 */
export function playerLimitForSlug(slug: string): number {
  return TOURNAMENTS.find((t) => t.slug === slug)?.playerCount ?? 0;
}
