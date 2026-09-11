import { NextResponse } from "next/server";
import { TEAM_COOKIE } from "@/lib/team-auth";

/**
 * POST /api/team/logout
 *
 * Clears the team session cookie. Public in proxy.ts on purpose: a browser
 * holding an expired or corrupt cookie has to be able to clear it, and a logout
 * that required a valid session would leave it permanently stuck.
 *
 * maxAge: 0 rather than cookies.delete() so the response carries an explicit
 * expired Set-Cookie for the same path the login set — which is what actually
 * makes the browser drop it.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(TEAM_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
