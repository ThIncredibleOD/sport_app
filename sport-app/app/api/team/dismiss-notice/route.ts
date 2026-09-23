import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isUuid, verifyTeamSession } from "@/lib/team-auth";

/**
 * POST /api/team/dismiss-notice  { changeId }
 *
 * Marks a "could not be applied" note as seen, so it stops appearing.
 *
 * Only ever reaches a REJECTED row. An approved change was never announced, and
 * a pending one has not been decided — dismissing either would be the team
 * acting on information the portal deliberately doesn't give them. The status
 * filter below is what enforces that, not the UI.
 */
export async function POST(request: NextRequest) {
  try {
    const registrationId = verifyTeamSession(request);
    if (!registrationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      changeId?: unknown;
    } | null;

    const changeId = body?.changeId;
    if (!isUuid(changeId)) {
      return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from("pending_changes")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", changeId)
      // Scoped to the session's registration, so a team can only dismiss its
      // own notes, and to 'rejected', so this route cannot touch a decision
      // that hasn't been made.
      .eq("registration_id", registrationId)
      .eq("status", "rejected");

    if (error) throw error;

    // Success either way: a row that didn't match was already dismissed or was
    // never dismissible, and in both cases the note is gone from the team's
    // view, which is all they asked for.
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
