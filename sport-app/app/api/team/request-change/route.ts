import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isUuid, normalizePhone, verifyTeamSession } from "@/lib/team-auth";
import { playerBelongsToRegistration, supersedePending } from "@/lib/team-data";
import {
  isApprovalPlayerField,
  isApprovalRegistrationField,
  isDateField,
} from "@/lib/team-fields";

/**
 * POST /api/team/request-change  { field, value, playerId? }
 *
 * Queues a change to a field that establishes who somebody is — a name, a date
 * of birth, a nationality — plus the contact phone. Nothing is written to the
 * live row here; a `pending_changes` row is created and the organiser resolves
 * it from the admin page.
 *
 * THE RESPONSE SAYS PLAIN SUCCESS, AND SO DOES THE TEAM'S NEXT PAGE LOAD.
 * This is a decision, not an oversight. /api/team/registration overlays pending
 * values so the team sees exactly what they typed, with nothing on screen
 * suggesting a review. The reason a review exists at all is that this is an
 * age-restricted tournament and a silently-edited date of birth would void the
 * eligibility check — and a team that knows which fields get looked at is a
 * team that knows which ones don't.
 *
 * If a change is rejected, the field reverts and the team is told that much —
 * see the `notices` block in /api/team/registration.
 *
 * The proof-of-age document is the other approval-gated field, but it arrives
 * as a file, so it is queued by /api/team/upload rather than here.
 */

const MAX_VALUE_LENGTH = 200;

/** The earliest date of birth worth accepting. Guards against a typo'd year. */
const EARLIEST_DOB = "1900-01-01";

function validateValue(field: string, value: string): string | null {
  if (value.length > MAX_VALUE_LENGTH) {
    return `That value is too long (max ${MAX_VALUE_LENGTH} characters).`;
  }

  if (isDateField(field)) {
    // A player's own date of birth is required; an official's may be cleared,
    // because an official nobody entered has no date and the column is
    // nullable. `dob` is the player one.
    if (value.trim() === "") {
      return field === "dob"
        ? "A player's date of birth can't be left blank."
        : null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return "Please enter the date as YYYY-MM-DD.";
    }
    const date = new Date(`${value.trim()}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return "That isn't a real date.";
    }
    if (value.trim() < EARLIEST_DOB) {
      return "Please check that date — the year looks wrong.";
    }
    // Not in the future. Compared as text against today's ISO date, which is
    // safe because both are YYYY-MM-DD and sort chronologically.
    if (value.trim() > new Date().toISOString().slice(0, 10)) {
      return "A date of birth can't be in the future.";
    }
    return null;
  }

  if (field === "contact_phone") {
    // Held to the same standard the login uses, because it IS the login. A
    // phone that doesn't normalize to 10 digits would be approved and then
    // never match an attempt to sign in with it — locking the team out of the
    // portal through a change that reported success.
    return normalizePhone(value)
      ? null
      : "Please enter a phone number with at least 10 digits.";
  }

  if (field.endsWith("full_name") || field === "full_name") {
    // Player names are required; an official's name being cleared is how a
    // team removes an official it no longer has.
    if (field === "full_name" && value.trim().length < 2) {
      return "Please enter the player's full name.";
    }
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const registrationId = verifyTeamSession(request);
    if (!registrationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      field?: unknown;
      value?: unknown;
      playerId?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const field = typeof body.field === "string" ? body.field : "";
    const value = typeof body.value === "string" ? body.value : "";
    const playerId = body.playerId ?? null;
    const targetsPlayer = playerId !== null;

    // The allow-list is the authorization, exactly as in /api/team/update.
    // proof_of_age_path is excluded here even though it is an approval field:
    // it is a file, and /api/team/upload is the only route that may queue one.
    if (targetsPlayer) {
      if (!isApprovalPlayerField(field) || field === "proof_of_age_path") {
        return NextResponse.json(
          { error: "That field can't be edited here." },
          { status: 400 },
        );
      }
      if (!isUuid(playerId)) {
        return NextResponse.json({ error: "Invalid player." }, { status: 400 });
      }
    } else if (!isApprovalRegistrationField(field)) {
      return NextResponse.json(
        { error: "That field can't be edited here." },
        { status: 400 },
      );
    }

    const problem = validateValue(field, value);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const trimmed = value.trim();

    /* ------------------------- Read the live value ------------------------ */
    // old_value always comes from the LIVE row, never from a superseded pending
    // row. It is what a rejection reverts to and what the organiser is shown as
    // "before", so chaining it through an unapproved value would show the admin
    // a comparison against something that was never true.
    let liveValue: string | null = null;

    if (targetsPlayer) {
      const { data: player, error } = await supabase
        .from("players")
        .select(`id, ${field}`)
        .eq("id", playerId)
        .eq("registration_id", registrationId)
        .maybeSingle();

      if (error) throw error;
      if (!player) {
        return NextResponse.json({ error: "Invalid player." }, { status: 404 });
      }
      const row = player as Record<string, unknown>;
      liveValue = row[field] === null ? null : String(row[field]);
    } else {
      const { data: registration, error } = await supabase
        .from("registrations")
        .select(`id, payment_status, ${field}`)
        .eq("id", registrationId)
        .maybeSingle();

      if (error) throw error;
      if (!registration) {
        return NextResponse.json(
          { error: "This registration is no longer active." },
          { status: 403 },
        );
      }
      const row = registration as Record<string, unknown>;
      if (row.payment_status === "rejected") {
        return NextResponse.json(
          {
            error:
              "This registration is no longer active. Please contact the organiser.",
          },
          { status: 403 },
        );
      }
      liveValue = row[field] === null ? null : String(row[field]);
    }

    // Only reachable for a player field, since the registration branch checks
    // ownership by filtering on the id from the cookie. Kept for player fields
    // because the id came from the request body.
    if (targetsPlayer) {
      const owned = await playerBelongsToRegistration(
        supabase,
        playerId as string,
        registrationId,
      );
      if (!owned) {
        return NextResponse.json({ error: "Invalid player." }, { status: 404 });
      }
    }

    /* ------------------- One queued request per field --------------------- */
    await supersedePending(
      supabase,
      registrationId,
      targetsPlayer ? (playerId as string) : null,
      field,
    );

    // Typing a value, then typing the original back, means the team wants
    // nothing changed. supersedePending has already removed the outstanding
    // request, so there is nothing left to queue — and queuing a no-op would
    // put a pointless decision in front of the organiser.
    const unchanged = (liveValue ?? "") === trimmed;
    if (unchanged) {
      return NextResponse.json({ success: true, value: trimmed });
    }

    const { error: insertError } = await supabase
      .from("pending_changes")
      .insert([
        {
          registration_id: registrationId,
          player_id: targetsPlayer ? playerId : null,
          field,
          old_value: liveValue,
          new_value: trimmed,
          status: "pending",
        },
      ]);

    if (insertError) throw insertError;

    // Plain success, and the value echoed back as though it applied. See the
    // header comment — this wording is the feature.
    return NextResponse.json({ success: true, value: trimmed });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
