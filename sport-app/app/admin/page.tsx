import { redirect } from "next/navigation";

// Bare /admin has no UI of its own. The proxy already bounces unauthenticated
// visitors to /admin/login; an authenticated admin landing here is sent on to
// the approvals dashboard.
export default function AdminIndexRedirect() {
  redirect("/admin/approvals");
}
