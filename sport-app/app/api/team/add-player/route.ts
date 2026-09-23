import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { verifyTeamSession } from "@/lib/team-auth";
import {
  PROOF_BUCKET,
  approvedDocumentPath,
  replacementPhotoPath,
  validateUpload,
} from "@/lib/team-data";
import { playerLimitForSlug } from "@/lib/tournaments";
import { isValidPreferredFoot, parseHeightCm } from "@/lib/height";

/**
 * POST /api/team/add-player  (multipart form data)
 *
 *   full_name, dob, nationality, jersey_number, position   required
 *   height_cm, preferred_foot                              optional
 *   photo                                                  optional file
 *   proof_of_age                                           required file
 *
 * Adds a player to the team's own roster, up to the tournament's limit.
 *
 * THE PLAYER IS ON THE ROSTER IMMEDIATELY — no organiser approval, nothing in
 * the pending-changes queue. That is a deliberate choice by the organiser, and
 * it is the one place in this portal where identity fields are written without
 * a review, so the reasoning matters:
 *
 * Editing an EXISTING player's date of birth is gated because that player has
 * already been vetted, and a silent edit afterwards would void the check. A
 * player being added has never been vetted, so there is no earlier decision to
 * undermine — the question is only whether they arrive with evidence. So
 * PROOF OF AGE IS REQUIRED HERE, exactly as it is on the registration form
 * (`playerBlockingGaps`, context/sportContext.tsx): a player cannot join a
 * squad through this route without the document the age limit rests on.
 *
 * A photo is NOT required, again matching the registration form, so a team can
 * add a player now and attach the photo later through the existing PhotoField.
 *
 * THE LIMIT IS ENFORCED HERE, not only in the page. The button disappears when
 * a roster is full, but a button is not a gate — the count below is.
 */

const MAX_VALUE_LENGTH = 200;

/** The earliest date of birth worth accepting. Guards against a typo'd year. */
const EARLIEST_DOB = "1900-01-01";

/** Same rules the queue applies to a date of birth — see request-change. */
function validateDob(value: string): string | null {
  if (value === "") return "A player's date of birth can't be left blank.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Please enter the date as YYYY-MM-DD.";
  }
  if (Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    return "That isn't a real date.";
  }
  if (value < EARLIEST_DOB) {
    return "Please check that date — the year looks wrong.";
  }
  // Compared as text against today's ISO date: both are YYYY-MM-DD, which
  // sorts chronologically.
  if (value > new Date().toISOString().slice(0, 10)) {
    return "A date of birth can't be in the future.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const registrationId = verifyTeamSession(request);
    if (!registrationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "That form could not be read. Please try again." },
        { status: 400 },
      );
    }

    const text = (key: string) => String(form.get(key) ?? "").trim();

    const fullName = text("full_name");
    const dob = text("dob");
    const nationality = text("nationality");
    const jerseyNumber = text("jersey_number");
    const position = text("position");
    const heightCm = text("height_cm");
    const preferredFoot = text("preferred_foot");

    const photo = form.get("photo");
    const proof = form.get("proof_of_age");

    const supabase = getSupabaseServer();

    /* ------------------- Is this team allowed another? -------------------- */
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, payment_status, tournaments ( slug )")
      .eq("id", registrationId)
      .maybeSingle();

    if (regError) throw regError;
    if (!registration) {
      return NextResponse.json(
        { error: "This registration is no longer active." },
        { status: 403 },
      );
    }

    // A cancelled team keeps its session for up to 8 hours, so it is re-checked
    // here exactly as /api/team/registration and request-change do.
    if (registration.payment_status === "rejected") {
      return NextResponse.json(
        {
          error:
            "This registration is no longer active. Please contact the organiser.",
        },
        { status: 403 },
      );
    }

    // The join comes back as an object or an array depending on how PostgREST
    // resolves the relationship, so both shapes are handled rather than assumed.
    const joined = registration.tournaments as
      | { slug?: string }
      | { slug?: string }[]
      | null;
    const slug = (Array.isArray(joined) ? joined[0]?.slug : joined?.slug) ?? "";

    // An unresolvable slug yields 0 — no room — rather than an unbounded roster.
    const limit = playerLimitForSlug(slug);

    const { count, error: countError } = await supabase
      .from("players")
      .select("id", { count: "exact" })
      .eq("registration_id", registrationId);

    if (countError) throw countError;

    const current = count ?? 0;
    if (current >= limit) {
      return NextResponse.json(
        {
          error:
            limit === 0
              ? "Players can't be added to this registration. Please contact the organiser."
              : `Your squad is full at ${limit} players, so no more can be added. Please contact the organiser if you need a change.`,
        },
        { status: 409 },
      );
    }

    /* ----------------------------- Validate ------------------------------- */
    if (fullName.length < 2) {
      return NextResponse.json(
        { error: "Please enter the player's full name." },
        { status: 400 },
      );
    }
    if (fullName.length > MAX_VALUE_LENGTH) {
      return NextResponse.json(
        { error: `That name is too long (max ${MAX_VALUE_LENGTH} characters).` },
        { status: 400 },
      );
    }

    const dobProblem = validateDob(dob);
    if (dobProblem) {
      return NextResponse.json({ error: dobProblem }, { status: 400 });
    }

    if (nationality === "") {
      return NextResponse.json(
        { error: "Please enter the player's nationality." },
        { status: 400 },
      );
    }
    if (nationality.length > MAX_VALUE_LENGTH) {
      return NextResponse.json(
        { error: "That nationality is too long." },
        { status: 400 },
      );
    }

    if (!/^\d{1,3}$/.test(jerseyNumber)) {
      return NextResponse.json(
        { error: "A jersey number should be up to three digits." },
        { status: 400 },
      );
    }

    if (position === "") {
      return NextResponse.json(
        { error: "Please choose the player's position." },
        { status: 400 },
      );
    }
    if (position.length > 40) {
      return NextResponse.json(
        { error: "That position is too long." },
        { status: 400 },
      );
    }

    // Both optional. Blank stays blank; anything present must be usable, or it
    // would sit in the database never rendering as a height.
    if (heightCm !== "" && parseHeightCm(heightCm) === null) {
      return NextResponse.json(
        { error: "A height should be a whole number between 100cm and 250cm." },
        { status: 400 },
      );
    }
    if (!isValidPreferredFoot(preferredFoot)) {
      return NextResponse.json(
        { error: "Preferred foot should be Left, Right or Both." },
        { status: 400 },
      );
    }

    // Required — the whole basis on which this route may skip a review.
    if (!(proof instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please attach proof of age. A player can't be added without one.",
        },
        { status: 400 },
      );
    }
    const proofProblem = validateUpload(proof, "document");
    if (proofProblem) {
      return NextResponse.json({ error: proofProblem }, { status: 400 });
    }

    const hasPhoto = photo instanceof File && photo.size > 0;
    if (hasPhoto) {
      const photoProblem = validateUpload(photo as File, "photo");
      if (photoProblem) {
        return NextResponse.json({ error: photoProblem }, { status: 400 });
      }
    }

    /* ------------------------------ Write --------------------------------- */
    // Generated here so both storage paths can carry it before the row exists —
    // the same order /api/team/upload uses for a queued document.
    const playerId = randomUUID();

    // Tracked so a failed insert can take its objects with it.
    const uploaded: { bucket: string; path: string }[] = [];

    const cleanUp = async () => {
      for (const item of uploaded) {
        try {
          await supabase.storage.from(item.bucket).remove([item.path]);
        } catch {
          // Orphaned file: a few KB, and the insert failure is what matters.
        }
      }
    };

    const proofPath = approvedDocumentPath(registrationId, playerId, proof.name);
    const { error: proofUploadError } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(proofPath, proof, { contentType: proof.type || undefined });

    if (proofUploadError) throw proofUploadError;
    uploaded.push({ bucket: PROOF_BUCKET, path: proofPath });

    let photoUrl = "";
    if (hasPhoto) {
      const file = photo as File;
      // Carries the player id, so two players in one team can never target the
      // same object — the failure that once put one face on a whole squad.
      const path = replacementPhotoPath(
        registrationId,
        `photo_${playerId.slice(0, 8)}`,
        file.name,
      );
      const { error: photoUploadError } = await supabase.storage
        .from("player-photos")
        .upload(path, file, { contentType: file.type || undefined });

      if (photoUploadError) {
        await cleanUp();
        throw photoUploadError;
      }
      uploaded.push({ bucket: "player-photos", path });
      photoUrl = supabase.storage.from("player-photos").getPublicUrl(path).data
        .publicUrl;
    }

    // No .select() — PostgREST would compile it to INSERT ... RETURNING, which
    // is subject to SELECT policies these tables don't have. The id is
    // generated above instead, which is how the rest of this app does it.
    const { error: insertError } = await supabase.from("players").insert([
      {
        id: playerId,
        registration_id: registrationId,
        full_name: fullName,
        dob,
        nationality,
        jersey_number: jerseyNumber,
        position,
        height_cm: heightCm || null,
        preferred_foot: preferredFoot || null,
        photo_url: photoUrl || null,
        proof_of_age_path: proofPath,
      },
    ]);

    if (insertError) {
      // Nothing references these objects — the row that would have is the one
      // that just failed — so they are removed outright rather than through
      // deleteIfUnreferenced.
      await cleanUp();
      throw insertError;
    }

    // Shaped exactly like an entry from /api/team/registration's safePlayers,
    // so the page can append it without refetching. The document PATH is not
    // included: it points into a private bucket and never goes to a browser.
    return NextResponse.json({
      success: true,
      player: {
        id: playerId,
        full_name: fullName,
        dob,
        nationality,
        jersey_number: jerseyNumber,
        position,
        height_cm: heightCm || null,
        preferred_foot: preferredFoot || null,
        photo_url: photoUrl || null,
        has_proof_of_age: true,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
