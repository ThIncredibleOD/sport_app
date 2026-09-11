import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import {
  TEAM_COOKIE,
  TEAM_SESSION_MAX_AGE,
  createTeamSession,
  normalizePhone,
} from "@/lib/team-auth";

/**
 * POST /api/team/login  { reference, phone }
 *
 * Signs a team in to the self-service portal. The credential is the
 * registration reference printed on their roster PDF plus the phone number on
 * the registration.
 *
 * WHY TWO FACTORS. `lib/reference.ts` says it outright: the reference "is a
 * LOOKUP AID, not a secret". It is printed on the roster PDF (beside the phone
 * and email), read out at the desk, and only 8 hex characters long. Guessing one
 * is not the realistic attack — 4.3 billion combinations against a rate limit
 * makes that hopeless — but a LEAKED one is, because that PDF gets shared,
 * forwarded and photographed. What sits behind this login is minors' names,
 * dates of birth and identity documents, so the reference alone is not enough.
 * The phone is something the team always knows and the organiser never has to
 * distribute.
 */

/** Failed attempts allowed per reference before it is locked out. */
const MAX_FAILURES_PER_REFERENCE = 5;

/**
 * Failed attempts allowed per IP. Higher than the per-reference limit because
 * one venue's wifi (or one carrier NAT) can legitimately be several teams.
 */
const MAX_FAILURES_PER_IP = 20;

/** Window both limits are measured over. */
const RATE_WINDOW_MS = 15 * 60 * 1000;

/** How long a login attempt row is kept. Only the window above is ever read. */
const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * The ONE answer given for every failed login: wrong reference, wrong phone, no
 * such team, or a cancelled one.
 *
 * Saying "no team has that reference" would turn this endpoint into a way to
 * test references — and since a reference is only 8 hex characters and appears
 * on a shared PDF, confirming which ones are real is worth something to
 * somebody. Saying "wrong phone" would confirm the reference outright. One
 * message for every failure means a wrong guess teaches nothing.
 */
const LOGIN_FAILED =
  "That reference and phone number don't match a registered team. Check the reference on your roster summary and the phone number you registered with.";

/**
 * Best guess at the caller's IP, for rate limiting.
 *
 * On Vercel x-forwarded-for is set by the platform and its FIRST entry is the
 * real client. Locally it is usually absent, so everything shares the
 * "unknown" bucket — which only affects a developer hitting their own login
 * page, and failing that direction is the safe one.
 */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

/**
 * The reference in canonical form: 8 uppercase hex characters, or "" if the
 * input can't be one.
 *
 * Teams retype this off a PDF, so spaces and dashes are stripped rather than
 * rejected, and lowercase is accepted. Anything left that isn't 8 hex
 * characters cannot be a reference — `registrationReference` produces exactly
 * that from a UUID's first 8 characters — so it fails without a database
 * lookup.
 */
function normalizeReference(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  return cleaned.length === 8 ? cleaned : "";
}

/**
 * True for "the portal tables haven't been created yet".
 *
 * The login ledger is required for rate limiting, and rate limiting is a
 * security control, so a missing table must not silently disable it. This turns
 * that specific case into an explanatory 503 instead of a generic 500 — the
 * SQL in SUPABASE_MIGRATION.sql simply hasn't been run.
 */
function isMissingTable(err: unknown): boolean {
  const message = errorMessage(err).toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const ip = clientIp(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: LOGIN_FAILED }, { status: 400 });
    }

    const { reference: rawReference, phone: rawPhone } = (body ?? {}) as {
      reference?: unknown;
      phone?: unknown;
    };

    const reference = normalizeReference(rawReference);
    const phone = normalizePhone(
      typeof rawPhone === "string" ? rawPhone : "",
    );

    /* ----------------------------- Rate limit ---------------------------- */
    // Checked BEFORE the credentials are looked at, and keyed on the typed
    // reference rather than a matched team, so a lockout costs the same whether
    // the reference is real or not. An in-memory counter is not an option:
    // Vercel runs several lambdas, so each would see a fraction of the attempts
    // and reset without warning.
    //
    // ROWS ARE FETCHED, NOT COUNTED WITH `head: true`. A head request has no
    // response body, so PostgREST's error cannot be parsed out of it and
    // supabase-js returns `{ error: null, count: null }` for a table that does
    // not exist. That reads as "zero failures so far" — the limiter would be
    // silently disabled by the exact condition it is supposed to report. A
    // bounded select carries the error, and capping at the limit keeps it as
    // cheap as a count: at most 5 and 20 id-only rows.
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

    const [byReference, byIp] = await Promise.all([
      supabase
        .from("team_login_attempts")
        .select("id")
        .eq("reference", reference || "invalid")
        .eq("succeeded", false)
        .gte("attempted_at", since)
        .limit(MAX_FAILURES_PER_REFERENCE),
      supabase
        .from("team_login_attempts")
        .select("id")
        .eq("ip", ip)
        .eq("succeeded", false)
        .gte("attempted_at", since)
        .limit(MAX_FAILURES_PER_IP),
    ]);

    if (byReference.error || byIp.error) {
      const failure = byReference.error ?? byIp.error;
      if (isMissingTable(failure)) {
        return NextResponse.json(
          {
            error:
              "The team portal isn't finished being set up on the server yet. Please contact the organiser.",
          },
          { status: 503 },
        );
      }
      throw failure;
    }

    const tooManyForReference =
      (byReference.data?.length ?? 0) >= MAX_FAILURES_PER_REFERENCE;
    const tooManyForIp = (byIp.data?.length ?? 0) >= MAX_FAILURES_PER_IP;

    if (tooManyForReference || tooManyForIp) {
      return NextResponse.json(
        {
          error:
            "Too many failed attempts. Please wait 15 minutes and try again, or contact the organiser.",
        },
        { status: 429 },
      );
    }

    // Record the failure, then answer. Written before returning so a client
    // that abandons the connection is still counted.
    //
    // A FAILED WRITE IS NOT IGNORED. This insert is the entire memory of the
    // rate limiter: if it quietly does nothing, the count above stays at zero
    // for ever and guesses become unlimited. So an unwritable ledger refuses
    // the attempt outright rather than answering as though it had been
    // counted. It costs a legitimate team a confusing message during a
    // database outage; the alternative costs the rate limit altogether.
    const fail = async () => {
      const { error: ledgerError } = await supabase
        .from("team_login_attempts")
        .insert([{ reference: reference || "invalid", ip, succeeded: false }]);

      if (ledgerError) {
        return NextResponse.json(
          {
            error: isMissingTable(ledgerError)
              ? "The team portal isn't finished being set up on the server yet. Please contact the organiser."
              : "Sign in is temporarily unavailable. Please try again shortly.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: LOGIN_FAILED }, { status: 401 });
    };

    // A phone with fewer than 10 digits normalizes to "" (see normalizePhone).
    // That must never be compared, or a registration stored with a blank phone
    // would match a login that left the field blank.
    if (!reference || !phone) return await fail();

    /* -------------------------- Find the team ---------------------------- */
    // The reference is the first 8 characters of the registration UUID, so
    // instead of casting the id to text (which no index could help with) the
    // lookup is a RANGE over the primary key: every UUID whose first 8 hex
    // characters are this reference sorts between these two bounds, because
    // Postgres compares uuid values byte by byte in the same order the hex text
    // reads. Uses the primary key index directly.
    const low = `${reference.toLowerCase()}-0000-0000-0000-000000000000`;
    const high = `${reference.toLowerCase()}-ffff-ffff-ffff-ffffffffffff`;

    const { data: candidates, error: lookupError } = await supabase
      .from("registrations")
      .select("id, contact_phone, payment_status")
      .gte("id", low)
      .lte("id", high);

    if (lookupError) throw lookupError;

    // Normally at most one row. Iterated rather than indexed because an 8-char
    // prefix is not guaranteed unique, and the phone is what disambiguates.
    const match = (candidates ?? []).find(
      (row) => normalizePhone(row.contact_phone) === phone,
    );

    if (!match) return await fail();

    // 'rejected' means cancelled/withdrawn (the column name is historical). A
    // cancelled team has nothing to edit, and it gets the SAME message as a bad
    // password so that a leaked reference can't be used to learn a team's
    // status either.
    if (match.payment_status === "rejected") return await fail();

    /* ----------------------------- Success ------------------------------- */
    const response = NextResponse.json({ success: true });
    response.cookies.set(TEAM_COOKIE, createTeamSession(match.id), {
      httpOnly: true, // never readable from JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEAM_SESSION_MAX_AGE,
    });

    await supabase
      .from("team_login_attempts")
      .insert([{ reference, ip, succeeded: true }]);

    // Opportunistic prune, on success only — a successful login is rare
    // compared with a failed one, and the window this table is read over is 15
    // minutes, so nothing older than a day is ever needed. Keeping it here
    // means no scheduled job and no unbounded growth. A failure to prune is
    // ignored: it must never cost a team its login.
    await supabase
      .from("team_login_attempts")
      .delete()
      .lt(
        "attempted_at",
        new Date(Date.now() - ATTEMPT_RETENTION_MS).toISOString(),
      );

    return response;
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
