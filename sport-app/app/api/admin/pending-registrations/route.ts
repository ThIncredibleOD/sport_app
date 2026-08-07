import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * GET /api/admin/pending-registrations
 *
 * Returns all registrations where payment_status = "pending_verification",
 * joined with tournament metadata, ordered by newest first. Service-role only
 * (bypasses RLS); the /admin/* proxy guards access to the caller.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("registrations")
      .select(
        `
        id,
        academy_name,
        contact_name,
        contact_phone,
        contact_email,
        payment_receipt_path,
        receipt_pdf_url,
        payment_status,
        created_at,
        tournaments (
          name,
          slug
        )
      `,
      )
      .eq("payment_status", "pending_verification")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ registrations: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
