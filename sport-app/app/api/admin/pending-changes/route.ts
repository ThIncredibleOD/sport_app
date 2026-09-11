import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";
import { fieldLabel } from "@/lib/team-fields";
import { registrationReference } from "@/lib/reference";

/**
 * GET /api/admin/pending-changes
 *
 * Every change a team has requested that hasn't been resolved, newest first,
 * with enough context to decide on it: which team, which player, the value it
 * replaces and the value asked for.
 *
 * These are the identity fields — names, dates of birth, nationalities and
 * proof-of-age documents. They are queued rather than applied because this is
 * an age-restricted tournament: if a team could silently change a date of birth
 * or swap a birth certificate after being approved, the eligibility check would
 * mean nothing. The contact phone is in here too, because it is half the portal
 * login and an instant change would be a lockout path.
 *
 * Service-role only, and `isAdminRequest` is re-checked here alongside the
 * proxy — see lib/admin-auth.ts for why both layers are kept.
 *
 * A document change's `new_value` is a PRIVATE bucket path, not a URL. It is
 * returned so the organiser can trade it for a signed URL via
 * /api/admin/get-receipt-signed-url, which is the only way to read that bucket.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("pending_changes")
      .select(
        `
        id,
        registration_id,
        player_id,
        field,
        old_value,
        new_value,
        created_at,
        registrations (
          academy_name,
          contact_name,
          contact_phone,
          tournaments (
            name,
            slug
          )
        ),
        players (
          full_name,
          jersey_number
        )
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      // The portal tables are created by the TEAM SELF-SERVICE PORTAL block in
      // SUPABASE_MIGRATION.sql. Until that has been run this table doesn't
      // exist, and an empty queue is the truthful answer — there is nowhere for
      // a request to have been recorded. Reported rather than thrown so the
      // Registrations page keeps working instead of showing a 500.
      const message = errorMessage(error).toLowerCase();
      if (
        message.includes("does not exist") ||
        message.includes("could not find the table") ||
        message.includes("schema cache")
      ) {
        return NextResponse.json({ changes: [], unavailable: true });
      }
      throw error;
    }

    // Flattened here rather than in the page, so the admin UI gets one shape
    // whether the change belongs to a player or to the registration itself.
    const changes = (data ?? []).map((row) => {
      const registration = row.registrations as {
        academy_name?: string;
        contact_name?: string;
        contact_phone?: string;
        tournaments?: { name?: string; slug?: string };
      } | null;
      const player = row.players as {
        full_name?: string;
        jersey_number?: string;
      } | null;

      return {
        id: row.id,
        registrationId: row.registration_id,
        reference: registrationReference(row.registration_id),
        academyName: registration?.academy_name ?? "(unknown team)",
        contactName: registration?.contact_name ?? "",
        contactPhone: registration?.contact_phone ?? "",
        tournamentName: registration?.tournaments?.name ?? "",
        playerId: row.player_id,
        playerName: player?.full_name ?? null,
        jerseyNumber: player?.jersey_number ?? null,
        field: row.field,
        label: fieldLabel(row.field),
        isDocument: row.field === "proof_of_age_path",
        oldValue: row.old_value,
        newValue: row.new_value,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({ changes });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
