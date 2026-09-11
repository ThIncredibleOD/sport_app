import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isUuid, verifyTeamSession } from "@/lib/team-auth";
import { PROOF_BUCKET } from "@/lib/team-data";

/**
 * POST /api/team/document-url  { playerId }
 *
 * A short-lived signed URL for one of the team's own proof-of-age documents.
 *
 * THE BODY CARRIES A PLAYER ID, NEVER A PATH. That is the important part. If
 * this route signed a path the client supplied, then every path in the private
 * bucket would be reachable by anybody with a session — and the paths are
 * predictable enough to guess at (`<regId>/age_1_<filename>`). Instead the path
 * is looked up from the player row, filtered by BOTH the player id and the
 * registration id from the session cookie, so a player belonging to another
 * team simply doesn't resolve.
 *
 * This bucket holds MINORS' IDENTITY DOCUMENTS. It must stay private; this
 * route and its admin counterpart are the only ways to read from it.
 */

/**
 * 60 seconds. Long enough to open the document, short enough that a URL copied
 * out of a browser's history or a shared screenshot is dead by the time anybody
 * else tries it. The admin equivalent uses an hour because an organiser works
 * through a whole roster in one sitting; a team opens one document.
 */
const SIGNED_URL_TTL_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
    const registrationId = verifyTeamSession(request);
    if (!registrationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      playerId?: unknown;
    } | null;

    const playerId = body?.playerId;
    if (!isUuid(playerId)) {
      return NextResponse.json({ error: "Invalid player." }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: player, error } = await supabase
      .from("players")
      .select("id, proof_of_age_path")
      .eq("id", playerId)
      // The session's registration, not one from the request. This is the
      // check that keeps one team out of another's documents.
      .eq("registration_id", registrationId)
      .maybeSingle();

    if (error) throw error;

    if (!player) {
      // Same answer as "no such player": a team must not be able to use this
      // route to discover whether an id belongs to someone else.
      return NextResponse.json({ error: "Invalid player." }, { status: 404 });
    }

    // An unresolved replacement is shown in preference to the original — the
    // team uploaded it, so it is the document they expect to see. Looked up
    // through the same registration scope as everything else here.
    const { data: pending, error: pendingError } = await supabase
      .from("pending_changes")
      .select("new_value")
      .eq("registration_id", registrationId)
      .eq("player_id", playerId)
      .eq("field", "proof_of_age_path")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingError) throw pendingError;

    const path = pending?.new_value || player.proof_of_age_path;

    if (!path) {
      return NextResponse.json(
        { error: "There's no document on file for this player yet." },
        { status: 404 },
      );
    }

    const { data, error: signError } = await supabase.storage
      .from(PROOF_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signError) throw signError;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
