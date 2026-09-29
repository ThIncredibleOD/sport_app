import { NextResponse, type NextRequest } from "next/server";
import { TEAM_COOKIE, readTeamSession } from "@/lib/team-auth";
import { registerPathRequiresAdmin } from "@/lib/tournaments";

// Kept in sync with the value set by /api/admin/login and /api/admin/logout.
const ADMIN_COOKIE = "admin_auth";

// Must stay reachable without a session, otherwise you could never log in
// (the login page would redirect-loop and the auth call itself would 401).
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

/**
 * Same idea for the team portal. Logout is public too: a browser holding an
 * expired or corrupt cookie must still be able to clear it, and a logout that
 * required a valid session would leave it stuck.
 */
const PUBLIC_TEAM_PATHS = new Set([
  "/team/login",
  "/api/team/login",
  "/api/team/logout",
]);

/**
 * Whether this request carries a valid admin session.
 *
 * Fails closed: no ADMIN_TOKEN in the environment means nobody is authorized,
 * rather than everybody being authorized against an undefined value. The
 * `Boolean(token)` is what enforces that — without it, a request with no cookie
 * at all would compare `undefined === undefined` and pass.
 */
function isAdminAuthorized(request: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  const cookie = request.cookies.get(ADMIN_COOKIE);
  return Boolean(token) && cookie?.value === token;
}

/**
 * Gate the two logged-in areas of the site.
 *
 * /admin/*  — the organiser's dashboard, behind a shared-secret cookie whose
 *             value is ADMIN_TOKEN, set only after a successful bcrypt check in
 *             /api/admin/login.
 * /team/*   — a registered team editing its own entry, behind an HMAC-signed
 *             cookie naming its registration id (see lib/team-auth.ts).
 *
 * The two are independent: an admin session grants nothing in the team portal
 * and vice versa. They are gated in one function only because Next matches a
 * single proxy file, so the first thing it does is work out which area the
 * request is for.
 *
 * /register/* is matched too, but is PUBLIC by default — see the branch below.
 *
 * Both fail closed — no ADMIN_TOKEN means no admin is authorized, no
 * TEAM_SESSION_SECRET means no team session verifies.
 *
 * THIS IS NOT THE ONLY GATE. The Next.js proxy guide states it "should not be
 * used as a full session management or authorization solution", and
 * CVE-2026-64642 was a real middleware/proxy bypass. So every route handler
 * re-checks for itself: isAdminRequest for admin routes, verifyTeamSession for
 * team ones. This function is the redirect layer and a cheap first refusal, not
 * the boundary.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isTeam =
    pathname === "/team" ||
    pathname.startsWith("/team/") ||
    pathname.startsWith("/api/team");

  if (isTeam) {
    if (PUBLIC_TEAM_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    // Verified properly rather than merely checked for presence: the proxy runs
    // on the Node.js runtime in Next 16, so the same node:crypto HMAC check the
    // route handlers use is available here. That means an expired session is
    // bounced to the login page instead of rendering a dashboard that then
    // fails every request it makes.
    const registrationId = readTeamSession(request.cookies.get(TEAM_COOKIE)?.value);
    if (registrationId) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/team/login", request.url));
  }

  // The public registration flows. This whole subtree is matched, but nearly
  // all of it is open to anyone — so the DEFAULT here is `next()`, and only the
  // tournaments flagged adminOnly in lib/tournaments.ts are refused. Getting
  // this the wrong way round would lock every academy out of registration, so
  // the branch asks the registry rather than pattern-matching a slug.
  //
  // This exists because the picker's "Admin Only" lock was cosmetic: it is a
  // router.push on a button, which anyone skips by typing
  // /register/unity-cup/account-profile into the address bar. This is the
  // refusal that actually holds.
  //
  // WHAT THIS DOES NOT COVER: submissions go browser -> Supabase directly with
  // the public anon key, not through a route handler here, so the proxy cannot
  // see them. Closing that path needs the database-level gate (the
  // `registration_open` column and the INSERT policy that reads it), not this
  // file.
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    if (!registerPathRequiresAdmin(pathname)) {
      return NextResponse.next();
    }

    if (isAdminAuthorized(request)) {
      return NextResponse.next();
    }

    // Carry the intended destination so logging in lands on the flow rather
    // than the approvals dashboard. app/admin/login/page.tsx reads this.
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (isAdminAuthorized(request)) {
    return NextResponse.next();
  }

  // API calls get a clean 401; page requests are bounced to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  // "/team" is listed separately from "/team/:path*" deliberately. `*` is
  // zero-or-more so the pattern is documented to cover the bare path, but the
  // dashboard itself lives at "/team" and it is the one route that must never
  // be reachable unauthenticated — not worth resting on a subtlety of the
  // matcher. Values must be static literals to be analysable at build time.
  //
  // "/register" is matched so the adminOnly flows can be refused server-side.
  // It CANNOT be narrowed to "/register/unity-cup/:path*" here for the same
  // reason the branch above asks the registry: matcher values must be static
  // literals, so a matcher cannot be derived from lib/tournaments.ts. Marking
  // the next tournament adminOnly has to keep working with no edit to this
  // file, which means matching the whole subtree and deciding in code.
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/team",
    "/team/:path*",
    "/api/team/:path*",
    "/register",
    "/register/:path*",
  ],
};
