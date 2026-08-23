/**
 * Pull a usable message out of anything thrown in a route handler.
 *
 * Supabase's PostgrestError and StorageError are PLAIN OBJECTS, not Error
 * instances, so the usual `err instanceof Error ? err.message : "Unknown error"`
 * silently discards every database and storage failure and reports "Unknown
 * error" instead. That turns a fixable problem ("column X does not exist") into
 * an unsolvable one, which is exactly the wrong trade at a registration desk.
 *
 * `details` and `hint` are appended when present — Postgres puts the actionable
 * part of a constraint or policy violation there rather than in `message`.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint]
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      // Postgres often repeats itself across these fields.
      .filter((p, i, all) => all.indexOf(p) === i);
    if (parts.length > 0) return parts.join(" — ");
  }

  if (typeof err === "string" && err) return err;
  return "Unknown error";
}
