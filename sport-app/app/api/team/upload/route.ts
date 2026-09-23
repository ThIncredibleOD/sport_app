import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isUuid, verifyTeamSession } from "@/lib/team-auth";
import {
  PROOF_BUCKET,
  deleteIfUnreferenced,
  pathFromPublicUrl,
  pendingDocumentPath,
  playerBelongsToRegistration,
  replacementPhotoPath,
  supersedePending,
  validateUpload,
} from "@/lib/team-data";

/**
 * POST /api/team/upload  (multipart form data)
 *
 *   file      the replacement file
 *   kind      "player-photo" | "team-logo" | "official-photo" | "proof-of-age"
 *   playerId  required for player-photo and proof-of-age
 *   official  required for official-photo: coach | manager | assistant_coach
 *             | medic1 | medic2
 *
 * PHOTOS APPLY AT ONCE. A wrong photo is an inconvenience, not an integrity
 * problem, and being able to fix one without waiting for the organiser is most
 * of why this portal exists.
 *
 * A PROOF-OF-AGE DOCUMENT IS QUEUED. It is the evidence the age limit rests on,
 * so a team cannot replace it unilaterally. The file is uploaded straight away
 * — to `<regId>/pending/<changeId>`, never to the player's real document path —
 * and only becomes the player's document if the organiser approves it. Until
 * then the original is untouched. The team is told the upload succeeded, which
 * it did, with no mention of a review.
 */

const PHOTO_BUCKETS = {
  "player-photo": "player-photos",
  "official-photo": "player-photos",
  "team-logo": "team-logos",
} as const;

/** Official slug → the registrations column holding that person's photo. */
const OFFICIAL_COLUMNS: Record<string, string> = {
  coach: "coach_photo_url",
  manager: "manager_photo_url",
  assistant_coach: "assistant_coach_photo_url",
  medic1: "medic1_photo_url",
  medic2: "medic2_photo_url",
};

type PhotoKind = keyof typeof PHOTO_BUCKETS;

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
        { error: "That upload could not be read. Please try again." },
        { status: 400 },
      );
    }

    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    const playerId = form.get("playerId") ? String(form.get("playerId")) : null;
    const official = form.get("official") ? String(form.get("official")) : null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was uploaded." },
        { status: 400 },
      );
    }

    const isProof = kind === "proof-of-age";
    const isPhoto = kind in PHOTO_BUCKETS;

    if (!isProof && !isPhoto) {
      return NextResponse.json(
        { error: "Unknown upload type." },
        { status: 400 },
      );
    }

    // Server-side size and type check. The browser compresses and checks before
    // sending, but a route handler cannot assume its caller was the browser.
    const problem = validateUpload(file, isProof ? "document" : "photo");
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Player-scoped uploads carry an id from the request body, so it is checked
    // against the session's registration before it is used.
    if (isProof || kind === "player-photo") {
      if (!isUuid(playerId)) {
        return NextResponse.json({ error: "Invalid player." }, { status: 400 });
      }
      const owned = await playerBelongsToRegistration(
        supabase,
        playerId,
        registrationId,
      );
      if (!owned) {
        return NextResponse.json({ error: "Invalid player." }, { status: 404 });
      }
    }

    /* ------------------------ Queued: proof of age ------------------------ */
    if (isProof) {
      const { data: player, error: readError } = await supabase
        .from("players")
        .select("proof_of_age_path")
        .eq("id", playerId)
        .eq("registration_id", registrationId)
        .maybeSingle();

      if (readError) throw readError;

      // Replaces any earlier unresolved document for this player, deleting the
      // superseded upload from storage so it doesn't linger unreferenced.
      await supersedePending(
        supabase,
        registrationId,
        playerId as string,
        "proof_of_age_path",
      );

      // The change id is generated here so the storage path can carry it before
      // the row exists. One id, one object, one decision.
      const changeId = randomUUID();
      const path = pendingDocumentPath(registrationId, changeId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(PROOF_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("pending_changes")
        .insert([
          {
            id: changeId,
            registration_id: registrationId,
            player_id: playerId,
            field: "proof_of_age_path",
            old_value: player?.proof_of_age_path ?? null,
            new_value: path,
            status: "pending",
          },
        ]);

      if (insertError) {
        // The row is what makes the object findable. Without it the upload is
        // unreachable by anybody, so it is removed rather than left behind.
        await supabase.storage.from(PROOF_BUCKET).remove([path]);
        throw insertError;
      }

      // Plain success. The document is on file; that it is pending is not
      // mentioned, by design — see the header comment.
      return NextResponse.json({ success: true });
    }

    /* -------------------------- Instant: photos --------------------------- */
    const bucket = PHOTO_BUCKETS[kind as PhotoKind];

    let column: string;
    let table: "players" | "registrations";
    let pathKind: string;

    if (kind === "player-photo") {
      table = "players";
      column = "photo_url";
      // Carries the player id, so two players in one team can never target the
      // same object — the failure that put one face on a whole squad.
      pathKind = `photo_${(playerId as string).slice(0, 8)}`;
    } else if (kind === "team-logo") {
      table = "registrations";
      column = "team_logo_url";
      pathKind = "logo";
    } else {
      if (!official || !(official in OFFICIAL_COLUMNS)) {
        return NextResponse.json(
          { error: "Unknown official." },
          { status: 400 },
        );
      }
      table = "registrations";
      column = OFFICIAL_COLUMNS[official];
      pathKind = official;
    }

    // Read the current value first, so the superseded object can be cleaned up
    // after the row has moved on.
    const { data: currentRow, error: currentError } = await supabase
      .from(table)
      .select(column)
      .eq("id", table === "players" ? playerId : registrationId)
      .maybeSingle();

    if (currentError) throw currentError;

    const previousUrl =
      (currentRow as Record<string, unknown> | null)?.[column] ?? "";

    // Fresh random suffix on every replacement path, so an upload can never
    // land on a path another file already owns — including the one being
    // replaced, which is still referenced until the row below is updated.
    const path = replacementPhotoPath(registrationId, pathKind, file.name);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type || undefined });

    if (uploadError) throw uploadError;

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data
      .publicUrl;

    const update =
      table === "registrations"
        ? { [column]: publicUrl, updated_at: new Date().toISOString() }
        : { [column]: publicUrl };

    let query = supabase.from(table).update(update);
    query =
      table === "players"
        ? query.eq("id", playerId).eq("registration_id", registrationId)
        : query.eq("id", registrationId);

    const { error: updateError } = await query;

    if (updateError) {
      // The row still points at the old file, so the new object is unreachable.
      await supabase.storage.from(bucket).remove([path]);
      throw updateError;
    }

    // Only now that the row points elsewhere, and only if nothing else still
    // references it. Several of the earliest registrations have multiple
    // players sharing one photo object — see deleteIfUnreferenced.
    if (typeof previousUrl === "string" && previousUrl) {
      await deleteIfUnreferenced(
        supabase,
        bucket,
        pathFromPublicUrl(previousUrl, bucket),
        registrationId,
      );
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
