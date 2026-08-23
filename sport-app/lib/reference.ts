/**
 * The short, human-quotable form of a registration id — printed on the roster
 * summary, shown on the confirmation page, quoted in both emails, and read out
 * at the registration desk.
 *
 * This lives in its own dependency-free module on purpose: the client bundle,
 * the server-side email route and the PDF generator all need the SAME format,
 * and importing it from lib/api/registration.ts would drag the browser Supabase
 * client into places that shouldn't have it.
 *
 * A UUID's first 8 hex chars give 4.3 billion possibilities, which is ample for
 * disambiguating a few hundred teams. It is a LOOKUP AID, not a secret — an
 * admin still resolves it against the full id.
 */
export function registrationReference(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
