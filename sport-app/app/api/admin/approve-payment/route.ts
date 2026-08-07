import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/approve-payment  { registrationId }
 *
 * Sets payment_status to "verified". Service-role only — the anon RLS policy
 * blocks all client UPDATEs, so this is the single path to approval.
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
      .update({ payment_status: "verified" })
      .eq("id", registrationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
