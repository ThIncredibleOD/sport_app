import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Lazily create a server-side Supabase client using the service_role key.
 *
 * This client bypasses Row Level Security (RLS) and must ONLY be used in
 * server-side code (API route handlers, server actions). NEVER import it into
 * client-side code, and NEVER log the key.
 *
 * The env check runs when this is CALLED — inside a request handler, where the
 * error is caught and returned as a 500 — not at import time. That way a
 * missing SUPABASE_SERVICE_ROLE_KEY can never break the production build.
 */
export function getSupabaseServer(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Server is not configured for admin actions (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
