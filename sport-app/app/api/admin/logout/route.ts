import { NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_auth";

/**
 * POST /api/admin/logout
 *
 * Clears the admin session cookie. (The proxy still guards this route, so only
 * a logged-in admin can call it — which is exactly who needs to log out.)
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
