import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const ADMIN_COOKIE = "admin_auth";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Resolve the admin bcrypt hash from the environment.
 *
 * IMPORTANT: a bcrypt hash contains `$` segments ($2b$10$...). Next.js runs
 * every .env value through dotenv-expand, which treats `$2b`/`$10`/etc. as
 * variable references and silently substitutes them away — corrupting the hash
 * so no password ever matches. To sidestep that entirely we store the hash
 * BASE64-encoded in ADMIN_PASSWORD_HASH_B64 (base64 has no `$`, so it survives
 * expansion untouched) and decode it here. A raw ADMIN_PASSWORD_HASH is still
 * honored as a fallback for anyone who escaped it correctly.
 */
function getAdminHash(): string {
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return process.env.ADMIN_PASSWORD_HASH ?? "";
}

/**
 * POST /api/admin/login  { password }
 *
 * Verifies the password against the bcrypt hash. On success, sets an httpOnly
 * session cookie holding ADMIN_TOKEN, which the proxy checks on every /admin
 * and /api/admin request. This endpoint is the only one the proxy lets through
 * unauthenticated.
 */
export async function POST(request: NextRequest) {
  try {
    const hash = getAdminHash();
    const token = process.env.ADMIN_TOKEN;

    if (!hash || !token) {
      return NextResponse.json(
        { error: "Admin login is not configured on the server." },
        { status: 500 },
      );
    }

    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
