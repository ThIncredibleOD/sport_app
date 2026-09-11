import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Session handling for the team self-service portal (app/team/*, /api/team/*).
 *
 * A team session says exactly one thing: "this browser has proved it holds the
 * reference and phone number of registration X". Every team route derives the
 * registration id it operates on FROM THIS COOKIE and never from the request
 * body — that is the single check standing between one team and another team's
 * players, so it must not be possible to ask for a different id.
 *
 * WHY A SIGNED COOKIE AND NOT A SESSIONS TABLE
 * The cookie carries its own registration id and expiry, signed with
 * TEAM_SESSION_SECRET. Verifying it is a local HMAC — no database round trip on
 * every request, and no table to prune. The trade is that a session cannot be
 * revoked individually; it dies when it expires. That is acceptable at eight
 * hours, and rotating TEAM_SESSION_SECRET is the lever that invalidates every
 * outstanding session at once if one is ever suspected of leaking.
 *
 * Next 16 runs proxy.ts on the Node.js runtime (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md),
 * so this one node:crypto implementation serves the proxy and the route
 * handlers alike — no second Web Crypto version to keep in step.
 */

export const TEAM_COOKIE = "team_session";

/** Eight hours, matching the admin session in /api/admin/login. */
export const TEAM_SESSION_MAX_AGE = 60 * 60 * 8;

function getSecret(): string {
  return process.env.TEAM_SESSION_SECRET ?? "";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Constant-time string compare.
 *
 * `a === b` on a signature leaks, through how long the comparison takes, how
 * many leading characters were right — which is enough to reconstruct a valid
 * signature one character at a time. timingSafeEqual takes the same time
 * whatever the input, but throws on a length mismatch, so that is checked
 * first and separately (the length of a signature is not a secret).
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Cookie value for a freshly authenticated team: `<regId>.<expiresAt>.<hmac>`.
 *
 * The expiry is signed along with the id rather than left to the cookie's own
 * Max-Age, because Max-Age is a request from the server that the browser is
 * free to ignore — a client that keeps sending an expired cookie would
 * otherwise keep a working session forever.
 */
export function createTeamSession(registrationId: string): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      "Team portal is not configured on the server (missing TEAM_SESSION_SECRET).",
    );
  }
  const expiresAt = Date.now() + TEAM_SESSION_MAX_AGE * 1000;
  const payload = `${registrationId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * True for a canonical UUID.
 *
 * Every id the portal accepts — from a cookie payload or a request body —
 * passes through here before it reaches a database filter. PostgREST answers a
 * malformed uuid with a raw Postgres type error (22P02), which would surface to
 * a team as an incomprehensible 500; checking the shape first turns that into a
 * plain 400, and keeps anything that isn't an id out of the query entirely.
 */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

/**
 * The registration id a cookie value proves, or null if it proves nothing.
 *
 * Fails closed in every direction: unset secret, malformed value, bad
 * signature, expired, or an id that isn't a UUID. Mirrors `isAdminRequest` in
 * lib/admin-auth.ts, which is deliberately built the same way.
 */
export function readTeamSession(value: string | undefined): string | null {
  const secret = getSecret();
  if (!secret || !value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [registrationId, expiresAt, signature] = parts;
  if (!safeEqual(signature, sign(`${registrationId}.${expiresAt}`, secret))) {
    return null;
  }

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;

  // The id goes straight into a database filter, so confirm the shape rather
  // than trusting that a valid signature implies a sane payload.
  if (!isUuid(registrationId)) return null;

  return registrationId;
}

/** The registration id this request is authenticated for, or null. */
export function verifyTeamSession(request: NextRequest): string | null {
  return readTeamSession(request.cookies.get(TEAM_COOKIE)?.value);
}

/* -------------------------------------------------------------------------- */
/*  Phone matching                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The comparable form of a phone number: digits only, last 10 kept.
 *
 * Nigerian numbers are written every way imaginable — 08012345678,
 * +234 801 234 5678, 0801-234-5678 — and the team typing in today is not
 * necessarily the person who typed it at the desk. All of those share the same
 * trailing ten digits, so that is what gets compared.
 *
 * Returns "" for anything with fewer than 10 digits, and callers must treat ""
 * as "no match possible" rather than as a value. Otherwise a registration with
 * a blank or malformed phone would match a login attempt that also left the
 * field blank, and the phone would stop being a second factor at all.
 */
export function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length < 10 ? "" : digits.slice(-10);
}

/** A random, unguessable suffix for a storage object name. */
export function storageSuffix(): string {
  return randomUUID().slice(0, 8);
}
