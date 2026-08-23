import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/cancel-registration  { registrationId }
 *
 * Sets payment_status to "rejected" — the column name is historical; it is now
 * just the registration's state, and "rejected" means cancelled/withdrawn. The
 * row is kept rather than deleted so a mistake is recoverable via
 * /api/admin/restore-registration.
 *
 * Service-role only — the anon RLS policy blocks all client UPDATEs. The
 * per-route `isAdminRequest` check stays alongside the /admin/* proxy on
 * purpose: a proxy alone was bypassable (CVE-2026-64642).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { registrationId } = await request.json();

    if (!registrationId || typeof registrationId !== "string") {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("registrations")
      .update({ payment_status: "rejected" })
      .eq("id", registrationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = errorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
