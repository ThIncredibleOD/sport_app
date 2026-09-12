import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { verifyTeamSession } from "@/lib/team-auth";
import { fieldLabel } from "@/lib/team-fields";
import { playerLimitForSlug } from "@/lib/tournaments";

/**
 * GET /api/team/registration
 *
 * Everything the team portal shows: the team's own registration, its officials
 * and its full roster.
 *
 * The registration id comes from the SESSION COOKIE and there is no parameter
 * to override it. That is the whole of the isolation between one team and
 * another — with no id in the request, there is nothing to tamper with.
 *
 * TWO RULES ABOUT PENDING CHANGES, both deliberate and both load-bearing:
 *
 * 1. A pending change is overlaid on the value it replaces, so the team sees
 *    the value they asked for as though it simply applied. Nothing in this
 *    response says "pending", and no count of pending items is included. The
 *    organiser reviews identity fields because age eligibility depends on them;
 *    a team that knows it is being reviewed is a team that has been invited to
 *    argue about it, so the review is silent.
 *
 * 2. A REJECTED change is not overlaid — the field reverts — and it is reported
 *    in `notices` so the team is told the change did not stick. The notice says
 *    only that; it does not mention approval, review or an organiser's
 *    decision.
 *
 * Storage paths are deliberately NOT returned. `proof_of_age_path` points into
 * a private bucket holding a minor's identity document; the team gets a boolean
 * saying a document is on file and trades a player id for a short-lived signed
 * URL at /api/team/document-url, which re-derives the path server-side. A path
 * that never reaches the client cannot be replayed from it.
 */
export async function GET(request: NextRequest) {
  try {
    // Re-checked here even though proxy.ts already verified it — see the note
    // in lib/admin-auth.ts. A proxy must not be the only gate.
    const registrationId = verifyTeamSession(request);
    if (!registrationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data: registration, error } = await supabase
      .from("registrations")
      .select(
        `
        id,
        academy_name,
        contact_name,
        contact_phone,
        contact_email,
        team_logo_url,
        coach_full_name,
        coach_dob,
        coach_nationality,
        coach_photo_url,
        manager_full_name,
        manager_dob,
        manager_nationality,
        manager_photo_url,
        assistant_coach_full_name,
        assistant_coach_dob,
        assistant_coach_nationality,
        assistant_coach_photo_url,
        medic1_full_name,
        medic1_dob,
        medic1_nationality,
        medic1_photo_url,
        medic2_full_name,
        medic2_dob,
        medic2_nationality,
        medic2_photo_url,
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
          height_cm,
          preferred_foot,
          photo_url,
          proof_of_age_path,
          created_at
        )
      `,
      )
      .eq("id", registrationId)
      .single();

    if (error) throw error;

    // A cancelled team can't be logged in (login refuses one), but the session
    // outlives the cancellation for up to 8 hours, so it is re-checked here.
    if (registration.payment_status === "rejected") {
      return NextResponse.json(
        {
          error:
            "This registration is no longer active. Please contact the organiser.",
        },
        { status: 403 },
      );
    }

    const { data: changes, error: changesError } = await supabase
      .from("pending_changes")
      .select("id, player_id, field, old_value, new_value, status, created_at")
      .eq("registration_id", registrationId)
      .in("status", ["pending", "rejected"])
      // A dismissed row has been seen and acknowledged, so it is neither
      // overlaid nor reported again. Pending rows always have this NULL, so
      // filtering here costs nothing and covers the rejected ones.
      .is("dismissed_at", null)
      .order("created_at", { ascending: true });

    if (changesError) throw changesError;

    /* ----------------------- Overlay pending values ----------------------- */
    // Ordered oldest-first above, so when more than one pending change exists
    // for a field the newest one wins — it is applied last. /api/team/
    // request-change supersedes rather than stacks, so this is a backstop.
    const pending = (changes ?? []).filter((c) => c.status === "pending");

    const registrationRow = registration as Record<string, unknown>;
    for (const change of pending) {
      if (change.player_id) continue;
      registrationRow[change.field] = change.new_value;
    }

    const players = (registration.players ?? []) as Record<string, unknown>[];
    const playersById = new Map(players.map((p) => [p.id as string, p]));
    for (const change of pending) {
      if (!change.player_id) continue;
      const player = playersById.get(change.player_id);
      if (player) player[change.field] = change.new_value;
    }

    /* --------------------------- Rejection notices ------------------------ */
    // Only rejected changes the team hasn't dismissed yet. The wording is set
    // here, in one place, so it can't drift into hinting at a review.
    const notices = (changes ?? [])
      .filter((c) => c.status === "rejected")
      .map((c) => ({
        id: c.id,
        playerId: c.player_id,
        field: c.field,
        label: fieldLabel(c.field),
        attempted: c.field === "proof_of_age_path" ? null : c.new_value,
        message: `The change to ${fieldLabel(
          c.field,
        ).toLowerCase()} could not be applied, so it has been left as it was. Please contact the organiser if it still needs changing.`,
      }));

    /* ------------- Strip private paths, expose a boolean instead ---------- */
    // Built by copying the allowed keys rather than by deleting the path from a
    // spread, so a column added to the select later is NOT exposed by default.
    const safePlayers = players.map((player) => ({
      id: player.id,
      full_name: player.full_name,
      dob: player.dob,
      nationality: player.nationality,
      jersey_number: player.jersey_number,
      position: player.position,
      height_cm: player.height_cm,
      preferred_foot: player.preferred_foot,
      photo_url: player.photo_url,
      has_proof_of_age: Boolean(player.proof_of_age_path),
      created_at: player.created_at,
    }));

    /* --------------------- How many players are allowed ------------------- */
    // Sent so the page knows whether to offer "Add player" at all. The number
    // is not authorization — /api/team/add-player counts the roster itself —
    // but the page cannot show "19 of 20" without it.
    const joinedTournament = registration.tournaments as
      | { slug?: string }
      | { slug?: string }[]
      | null;
    const slug =
      (Array.isArray(joinedTournament)
        ? joinedTournament[0]?.slug
        : joinedTournament?.slug) ?? "";

    return NextResponse.json({
      registration: { ...registrationRow, players: safePlayers },
      playerLimit: playerLimitForSlug(slug),
      notices,
    });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
