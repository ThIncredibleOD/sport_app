import { NextResponse, type NextRequest } from "next/server";
import { TEAM_COOKIE, readTeamSession } from "@/lib/team-auth";

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

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = process.env.ADMIN_TOKEN;
  const cookie = request.cookies.get(ADMIN_COOKIE);
  const authorized = Boolean(token) && cookie?.value === token;

  if (authorized) {
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
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/team",
    "/team/:path*",
    "/api/team/:path*",
  ],
};
