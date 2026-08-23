import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * The only private bucket left.
 *
 * No payment document is uploaded and consent forms are collected on paper, so
 * 'receipts' and 'consent-forms' are no longer written to and are no longer
 * signable here. Narrowing the allow-list means a leaked legacy path can't be
 * turned into a fresh link.
 *
 * proof-of-age holds MINORS' IDENTITY DOCUMENTS. This bucket must never be made
 * public — this guarded endpoint is the only way to read from it.
 */
const PRIVATE_BUCKETS = ["proof-of-age"] as const;

/**
 * POST /api/admin/get-receipt-signed-url  { bucket, path }
 *
 * Returns a short-lived (1 hour) signed URL for a private-bucket object, so an
 * admin can open a player's proof of age from the Registrations page. Signed
 * with the service role so it never depends on client storage policies.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bucket, path } = await request.json();

    if (
      typeof bucket !== "string" ||
      !(PRIVATE_BUCKETS as readonly string[]).includes(bucket)
    ) {
      return NextResponse.json(
        { error: `bucket must be one of: ${PRIVATE_BUCKETS.join(", ")}` },
        { status: 400 },
      );
    }
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    const message = errorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
