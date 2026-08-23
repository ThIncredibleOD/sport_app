import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "admin_auth";

/**
 * Defense-in-depth auth check for admin API routes.
 *
 * The proxy (proxy.ts) already guards every /api/admin/* request, but the
 * Next.js middleware/proxy-bypass advisory CVE-2026-64642 is a reminder that a
 * proxy must never be the ONLY gate on sensitive server work. Each route that
 * changes a registration's state or mints a signed URL for a private document
 * re-checks the session cookie here, so even a proxy bypass can't reach those
 * operations.
 *
 * Fails closed: if ADMIN_TOKEN is unset, no request is ever authorized.
 */
export function isAdminRequest(request: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  const cookie = request.cookies.get(ADMIN_COOKIE);
  return Boolean(token) && cookie?.value === token;
}
