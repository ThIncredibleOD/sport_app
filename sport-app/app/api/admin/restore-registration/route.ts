import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/restore-registration  { registrationId }
 *
 * Undoes a cancellation by putting the row back to "pending_payment", the state
 * every new registration is inserted in. This exists because cancelling is one
 * click behind a confirm() dialog during a busy registration desk — without an
 * undo, a mis-click would be unrecoverable from the UI.
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
      .update({ payment_status: "pending_payment" })
      .eq("id", registrationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = errorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
