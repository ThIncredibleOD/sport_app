import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";
import { isUuid } from "@/lib/team-auth";
import {
  PROOF_BUCKET,
  approvedDocumentPath,
  deleteIfUnreferenced,
} from "@/lib/team-data";
import {
  isApprovalPlayerField,
  isApprovalRegistrationField,
} from "@/lib/team-fields";

/**
 * POST /api/admin/resolve-change  { changeId, action: "approve" | "reject" }
 *
 * The organiser's decision on a queued change.
 *
 * APPROVE writes the requested value to the live column. For a proof-of-age
 * document that means moving the uploaded object from `<regId>/pending/<id>` to
 * a canonical path and pointing the player row at it — the pending object is
 * never referenced directly by a player row, so nothing is live until this
 * runs.
 *
 * REJECT discards it. The live value was never touched, so there is nothing to
 * revert; a rejected document upload is deleted, since nothing will ever
 * reference it again. The row is left with `dismissed_at` NULL, which is what
 * makes the team's next page load show "this change could not be applied".
 *
 * Approving is silent to the team by design — /api/team/registration has been
 * showing them the requested value all along, so an approval changes nothing on
 * their screen. Only a rejection is announced.
 *
 * The field is re-checked against the same allow-lists the team routes use.
 * This route holds the service role and writes directly to live columns, so it
 * does not take the queued row's word for what field it names: a row is only
 * ever created by /api/team/request-change or /api/team/upload, but "only ever"
 * is an assumption, and this is the place where being wrong about it would put
 * an arbitrary column write behind an Approve button.
 */

/**
 * The value to write, with "" collapsed to NULL.
 *
 * Every approval-gated field is nullable except a player's own name and date of
 * birth, both of which are validated non-empty before they are ever queued. A
 * cleared official name has to become NULL rather than "": that is how
 * registration stores an official the team doesn't have, and a `date` column
 * rejects an empty string outright.
 */
function valueForColumn(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      changeId?: unknown;
      action?: unknown;
    } | null;

    const changeId = body?.changeId;
    const action = body?.action;

    if (!isUuid(changeId)) {
      return NextResponse.json({ error: "Invalid change id." }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject".' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();

    // Filtered on status as well as id, so a second click on Approve finds
    // nothing and cannot apply the same change twice.
    const { data: change, error: readError } = await supabase
      .from("pending_changes")
      .select("id, registration_id, player_id, field, old_value, new_value")
      .eq("id", changeId)
      .eq("status", "pending")
      .maybeSingle();

    if (readError) throw readError;
    if (!change) {
      return NextResponse.json(
        { error: "That request has already been dealt with." },
        { status: 404 },
      );
    }

    const isDocument = change.field === "proof_of_age_path";
    const targetsPlayer = Boolean(change.player_id);

    // The allow-list check, applied to a row rather than to a request body.
    const fieldAllowed = targetsPlayer
      ? isApprovalPlayerField(change.field)
      : isApprovalRegistrationField(change.field);

    if (!fieldAllowed) {
      return NextResponse.json(
        {
          error: `"${change.field}" is not a field the portal may change. Nothing was written — this request looks wrong and is worth investigating.`,
        },
        { status: 400 },
      );
    }

    /* ------------------------------ Reject -------------------------------- */
    if (action === "reject") {
      if (isDocument && change.new_value) {
        // Nothing references it and nothing ever will. Removed directly rather
        // than through deleteIfUnreferenced: a pending object lives at a path
        // no row can point at, so there is nothing to check.
        try {
          await supabase.storage.from(PROOF_BUCKET).remove([change.new_value]);
        } catch {
          // An orphaned file costs a few KB; failing the rejection would leave
          // a decided request sitting in the queue.
        }
      }

      const { error } = await supabase
        .from("pending_changes")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", changeId)
        .eq("status", "pending");

      if (error) throw error;

      return NextResponse.json({ success: true, action: "rejected" });
    }

    /* ----------------------------- Approve -------------------------------- */
    if (isDocument) {
      if (!change.new_value || !change.player_id) {
        return NextResponse.json(
          { error: "That document request is incomplete and can't be applied." },
          { status: 400 },
        );
      }

      const destination = approvedDocumentPath(
        change.registration_id,
        change.player_id,
        change.new_value,
      );

      // Moved, not copied: one object, so there is never a moment where the
      // same document exists at two paths and a later cleanup has to guess
      // which one is live.
      const { error: moveError } = await supabase.storage
        .from(PROOF_BUCKET)
        .move(change.new_value, destination);

      if (moveError) throw moveError;

      const { error: updateError } = await supabase
        .from("players")
        .update({ proof_of_age_path: destination })
        .eq("id", change.player_id)
        // Registration id in the filter too, from the queued row — the same
        // scoping the team routes use.
        .eq("registration_id", change.registration_id);

      if (updateError) {
        // Put it back, so the request can be resolved again rather than
        // pointing at a path the player row doesn't know about.
        await supabase.storage
          .from(PROOF_BUCKET)
          .move(destination, change.new_value);
        throw updateError;
      }

      // The superseded document, now that the row points elsewhere. Guarded
      // because the earliest registrations have several players sharing one
      // document object — see deleteIfUnreferenced.
      if (change.old_value) {
        await deleteIfUnreferenced(
          supabase,
          PROOF_BUCKET,
          change.old_value,
          change.registration_id,
        );
      }
    } else if (targetsPlayer) {
      const { error } = await supabase
        .from("players")
        .update({ [change.field]: valueForColumn(change.new_value) })
        .eq("id", change.player_id)
        .eq("registration_id", change.registration_id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("registrations")
        .update({
          [change.field]: valueForColumn(change.new_value),
          updated_at: new Date().toISOString(),
        })
        .eq("id", change.registration_id);

      if (error) throw error;
    }

    const { error: markError } = await supabase
      .from("pending_changes")
      .update({ status: "approved", resolved_at: new Date().toISOString() })
      .eq("id", changeId)
      .eq("status", "pending");

    if (markError) throw markError;

    return NextResponse.json({ success: true, action: "approved" });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
