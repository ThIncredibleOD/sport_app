import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isAdminRequest } from "@/lib/admin-auth";

const PRIVATE_BUCKETS = ["consent-forms", "proof-of-age", "receipts"] as const;

/**
 * POST /api/admin/get-receipt-signed-url  { bucket, path }
 *
 * Returns a short-lived signed URL for a PRIVATE bucket object (payment
 * receipt, consent form, proof-of-age). Signed with the service role so it
 * never depends on client storage policies. Buckets stay private — only this
 * guarded endpoint can mint a link.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bucket, path } = await request.json();

    if (!bucket || !PRIVATE_BUCKETS.includes(bucket)) {
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
