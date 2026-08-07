import { redirect } from "next/navigation";

// Legacy route. The live registration flow now lives under
// /register/league/*. Anything still pointing here is sent to the start of
// that flow (there is no in-memory data to resume on a direct hit).
export default function LegacyLeaguePaymentRedirect() {
  redirect("/register/league/account-profile");
}
