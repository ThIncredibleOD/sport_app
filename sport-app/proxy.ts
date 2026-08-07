import { NextResponse, type NextRequest } from "next/server";

// Kept in sync with the value set by /api/admin/login and /api/admin/logout.
const ADMIN_COOKIE = "admin_auth";

// Must stay reachable without a session, otherwise you could never log in
// (the login page would redirect-loop and the auth call itself would 401).
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

/**
 * Gate every /admin/* page and /api/admin/* route behind a shared-secret
 * session cookie. The cookie value is compared to ADMIN_TOKEN, which is set
 * only after a successful bcrypt password check in /api/admin/login.
 *
 * Fails closed: if ADMIN_TOKEN is unset, nobody is authorized.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
