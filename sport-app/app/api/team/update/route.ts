import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isUuid, verifyTeamSession } from "@/lib/team-auth";
import { playerBelongsToRegistration } from "@/lib/team-data";
import {
  isInstantPlayerField,
  isInstantRegistrationField,
} from "@/lib/team-fields";

/**
 * POST /api/team/update  { field, value, playerId? }
 *
 * Applies a change a team is allowed to make on its own, immediately. Only the
 * fields in INSTANT_REGISTRATION_FIELDS / INSTANT_PLAYER_FIELDS get here — see
 * lib/team-fields.ts for why the identity fields don't, and go to
 * /api/team/request-change instead.
 *
 * The registration id comes from the session cookie. `playerId` is the one id
 * the body supplies, and it is checked against that registration before it is
 * used for anything.
 */

/** Per-field limits and format rules, applied before anything is written. */
const RULES: Record<
  string,
  { maxLength: number; required?: boolean; check?: (v: string) => string | null }
> = {
  contact_name: {
    maxLength: 120,
    required: true,
    check: (v) =>
      v.trim().length < 2 ? "Please enter the contact's full name." : null,
  },
  contact_email: {
    maxLength: 200,
    // Optional: registration never required an email, and a team that gave a
    // wrong one has to be able to clear it. Nothing is ever sent to it — there
    // is no email in this app at all — so it is only a record.
    check: (v) =>
      v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        ? null
        : "That doesn't look like an email address.",
  },
  jersey_number: {
    maxLength: 3,
    check: (v) =>
      v.trim() === "" || /^\d{1,3}$/.test(v.trim())
        ? null
        : "A jersey number should be up to three digits.",
  },
  position: { maxLength: 40 },
};

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
    const rawValue = typeof body.value === "string" ? body.value : "";
    const playerId = body.playerId ?? null;

    const targetsPlayer = playerId !== null;

    // The allow-list IS the authorization. A field that isn't on it cannot be
    // written through this route no matter who is asking, which is what keeps a
    // date of birth or a payment_status out of reach even though the service
    // role used below could technically write either.
    if (targetsPlayer) {
      if (!isInstantPlayerField(field)) {
        return NextResponse.json(
          { error: "That field can't be edited here." },
          { status: 400 },
        );
      }
      if (!isUuid(playerId)) {
        return NextResponse.json({ error: "Invalid player." }, { status: 400 });
      }
    } else if (!isInstantRegistrationField(field)) {
      return NextResponse.json(
        { error: "That field can't be edited here." },
        { status: 400 },
      );
    }

    const rule = RULES[field];
    if (rule) {
      if (rawValue.length > rule.maxLength) {
        return NextResponse.json(
          { error: `That value is too long (max ${rule.maxLength} characters).` },
          { status: 400 },
        );
      }
      if (rule.required && rawValue.trim() === "") {
        return NextResponse.json(
          { error: "That field can't be left blank." },
          { status: 400 },
        );
      }
      const problem = rule.check?.(rawValue);
      if (problem) {
        return NextResponse.json({ error: problem }, { status: 400 });
      }
    }

    const value = rawValue.trim();
    const supabase = getSupabaseServer();

    if (targetsPlayer) {
      const owned = await playerBelongsToRegistration(
        supabase,
        playerId as string,
        registrationId,
      );
      if (!owned) {
        // Deliberately the same answer as a player that doesn't exist: a team
        // must not be able to learn whether an id belongs to somebody else.
        return NextResponse.json({ error: "Invalid player." }, { status: 404 });
      }

      const { error } = await supabase
        .from("players")
        .update({ [field]: value })
        // Both ids in the filter, not just the player id — so even if the
        // ownership check above were ever removed, this UPDATE still could not
        // touch another team's row.
        .eq("id", playerId)
        .eq("registration_id", registrationId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("registrations")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", registrationId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, value });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
