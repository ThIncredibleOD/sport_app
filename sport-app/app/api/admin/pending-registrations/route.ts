import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * The states the Registrations page can ask for.
 *
 * These are `payment_status` column values — the column name is historical and
 * no longer means anything about money.
 *
 * 'pending_payment' — registered (the state every new row is inserted in).
 * 'rejected'        — cancelled.
 *
 * 'verified' and 'pending_verification' are legacy values from the old off-site
 * payment flow. They are still listed so any rows created before the switch stay
 * reachable from the dashboard instead of silently disappearing.
 */
const ALLOWED_STATUSES = [
  "pending_payment",
  "rejected",
  "verified",
  "pending_verification",
] as const;

const DEFAULT_STATUS = "pending_payment";

/**
 * GET /api/admin/pending-registrations[?status=rejected]
 *
 * Returns registrations in the requested state (default 'pending_payment' — the
 * live ones), joined with tournament metadata and the full player roster, newest
 * first.
 *
 * Service-role only (bypasses RLS). The per-route `isAdminRequest` check stays
 * alongside the /admin/* proxy on purpose — a proxy alone was bypassable
 * (CVE-2026-64642), so both layers are kept.
 *
 * Player rows include `proof_of_age_path`, which is a PRIVATE bucket path, not a
 * URL. It is useless on its own; the client trades it for a short-lived signed
 * URL via /api/admin/get-receipt-signed-url.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("status");
    const status =
      requested && (ALLOWED_STATUSES as readonly string[]).includes(requested)
        ? requested
        : DEFAULT_STATUS;

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
        coach_full_name,
        coach_dob,
        coach_nationality,
        receipt_pdf_url,
        payment_status,
        created_at,
        tournaments (
          name,
          slug
        ),
        players (
          id,
          full_name,
          dob,
          nationality,
          jersey_number,
          position,
          proof_of_age_path,
          photo_url
        )
      `,
      )
      .eq("payment_status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ registrations: data ?? [], status });
  } catch (err) {
    const message = errorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
