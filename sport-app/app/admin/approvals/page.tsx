"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  IdCard,
  Inbox,
  ListChecks,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { registrationReference } from "@/lib/reference";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Player {
  id: string;
  full_name: string;
  dob: string | null;
  nationality: string | null;
  jersey_number: string | null;
  position: string | null;
  /** PRIVATE bucket path, not a URL — traded for a signed URL on demand. */
  proof_of_age_path: string | null;
  /** PUBLIC bucket URL — safe to render directly. */
  photo_url: string | null;
}

interface Registration {
  id: string;
  academy_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  coach_full_name: string | null;
  coach_dob: string | null;
  coach_nationality: string | null;
  /** PUBLIC bucket URL — safe to render directly. */
  coach_photo_url: string | null;
  /* The team's other officials. All nullable: each of these people is optional
     to register, so a team may legitimately have none of them. The `*_photo_url`
     columns are PUBLIC bucket URLs like the coach's, not private paths. */
  manager_full_name: string | null;
  manager_dob: string | null;
  manager_nationality: string | null;
  manager_photo_url: string | null;
  assistant_coach_full_name: string | null;
  assistant_coach_dob: string | null;
  assistant_coach_nationality: string | null;
  assistant_coach_photo_url: string | null;
  medic1_full_name: string | null;
  medic1_dob: string | null;
  medic1_nationality: string | null;
  medic1_photo_url: string | null;
  medic2_full_name: string | null;
  medic2_dob: string | null;
  medic2_nationality: string | null;
  medic2_photo_url: string | null;
  receipt_pdf_url: string;
  created_at: string;
  tournaments: { name: string; slug: string } | null;
  players: Player[];
}

/** One row in the staff list: the head coach or one of the four officials. */
interface StaffMember {
  role: string;
  name: string;
  nationality: string | null;
  dob: string | null;
  photoUrl: string | null;
}

/**
 * The two states a registration can be in.
 *
 * These are `payment_status` column values — the name is historical and no
 * longer means anything about money. 'pending_payment' is simply the state every
 * new row is inserted in, and 'rejected' means cancelled.
 */
type Status = "pending_payment" | "rejected";

const TABS: { value: Status; label: string; icon: typeof ListChecks }[] = [
  { value: "pending_payment", label: "Registered", icon: ListChecks },
  { value: "rejected", label: "Cancelled", icon: Ban },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Head coach plus the four optional officials, in the order the form collects
 * them, skipping anyone the team didn't name.
 *
 * Rows written before the officials existed have NULL in every one of those
 * columns, so they simply come back as the head coach alone — no migration of
 * old data needed.
 */
function staffOf(reg: Registration): StaffMember[] {
  return [
    {
      role: "Team manager",
      name: reg.manager_full_name,
      nationality: reg.manager_nationality,
      dob: reg.manager_dob,
      photoUrl: reg.manager_photo_url,
    },
    {
      role: "Head coach",
      name: reg.coach_full_name,
      nationality: reg.coach_nationality,
      dob: reg.coach_dob,
      photoUrl: reg.coach_photo_url,
    },
    {
      role: "Assistant coach",
      name: reg.assistant_coach_full_name,
      nationality: reg.assistant_coach_nationality,
      dob: reg.assistant_coach_dob,
      photoUrl: reg.assistant_coach_photo_url,
    },
    {
      role: "Medic 1",
      name: reg.medic1_full_name,
      nationality: reg.medic1_nationality,
      dob: reg.medic1_dob,
      photoUrl: reg.medic1_photo_url,
    },
    {
      role: "Medic 2",
      name: reg.medic2_full_name,
      nationality: reg.medic2_nationality,
      dob: reg.medic2_dob,
      photoUrl: reg.medic2_photo_url,
    },
  ].flatMap((entry) =>
    entry.name?.trim() ? [{ ...entry, name: entry.name.trim() }] : [],
  );
}

/* -------------------------------------------------------------------------- */
/*  Staff list                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The team's staff on the summary card: head coach plus whichever officials were
 * entered. Renders nothing at all when a team has no staff on record, so an
 * older registration's card looks exactly as it did before.
 *
 * Thumbnails come from the PUBLIC player-photos bucket, so they render directly
 * — unlike a player's proof of age, which is private and has to be signed.
 */
function StaffList({ reg }: { reg: Registration }) {
  const staff = staffOf(reg);
  if (staff.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {staff.map((member) => (
        <div key={member.role} className="flex items-center gap-2 min-w-0">
          {member.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={member.photoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md object-cover border border-white/10"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-900">
              <UserRound className="h-4 w-4 text-slate-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-200">
              {member.name}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {member.role}
              {member.nationality ? ` · ${member.nationality}` : ""}
              {member.dob ? ` · born ${formatDate(member.dob)}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Registrations — the record of every team that has been entered.
 *
 * Read-mostly by design: browse teams, open a player's proof of age (signed URL,
 * private bucket), download a roster PDF. Nothing here tracks fees; money is
 * handled entirely off the site.
 *
 * The only mutation is cancel, with a matching restore so a mis-click at a busy
 * desk is recoverable.
 */
export default function AdminRegistrationsPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("pending_payment");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Bumped to re-run the fetch effect. Cheaper than duplicating the request
  // logic in every handler that needs fresh data.
  const [reloadToken, setReloadToken] = useState(0);

  // The request lives INSIDE the effect so React owns its lifecycle: switching
  // tabs or hitting refresh changes a dep, and the in-flight response from the
  // previous state is discarded instead of overwriting the new one.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/pending-registrations?status=${status}`,
        );
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load registrations.");

        const data = await res.json();
        if (cancelled) return;
        setRegistrations(data.registrations ?? []);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, reloadToken, router]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  function selectTab(next: Status) {
    if (next === status) return;
    setLoading(true);
    setRegistrations([]);
    setExpanded(new Set());
    setStatus(next);
  }

  function toggleExpanded(regId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  }

  async function runAction(
    endpoint: "cancel-registration" | "restore-registration",
    regId: string,
    failureLabel: string,
  ) {
    setActionLoading(regId);
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error(failureLabel);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : failureLabel);
    } finally {
      setActionLoading(null);
    }
  }

  function handleCancel(reg: Registration) {
    if (
      !confirm(
        `Cancel ${reg.academy_name}'s registration? It moves to the Cancelled tab, where you can restore it.`,
      )
    )
      return;
    void runAction(
      "cancel-registration",
      reg.id,
      "Could not cancel this registration.",
    );
  }

  function handleRestore(reg: Registration) {
    void runAction(
      "restore-registration",
      reg.id,
      "Could not restore this registration.",
    );
  }

  /**
   * Open a private-bucket document.
   *
   * The path alone is useless without a signature, so it is traded for a
   * short-lived signed URL server-side. Minted on click rather than up front so
   * links can't leak from the page source or a screenshot of the network tab.
   */
  async function handleViewPrivateDoc(
    bucket: "proof-of-age",
    path: string | null,
    label: string,
  ) {
    if (!path) {
      alert(`${label} is not available for this player.`);
      return;
    }
    try {
      const res = await fetch("/api/admin/get-receipt-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path }),
      });
      if (!res.ok) throw new Error(`Could not open ${label}.`);
      const data = await res.json();
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : `Could not open ${label}.`);
    }
  }

  function handleViewPDF(url: string) {
    if (!url) {
      alert("No roster summary was saved for this registration.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  }

  const active = status === "pending_payment";

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Registrations</h1>
              <p className="text-xs text-slate-400">
                {loading
                  ? "Loading…"
                  : `${registrations.length} ${active ? "registered" : "cancelled"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reload}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-xl border border-white/15 bg-slate-900/50 p-1 backdrop-blur-xl">
          {TABS.map((tab) => {
            const isActive = tab.value === status;
            return (
              <button
                key={tab.value}
                onClick={() => selectTab(tab.value)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-green-600 text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {loading && registrations.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Inbox className="w-16 h-16 mb-4" />
            <p className="text-lg font-semibold">
              {active ? "No registrations yet" : "Nothing cancelled"}
            </p>
            <p className="text-sm">
              {active
                ? "Teams appear here as soon as they are submitted"
                : "Cancelled registrations are kept here and can be restored"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg) => {
              const isOpen = expanded.has(reg.id);
              const busy = actionLoading === reg.id;

              return (
                <div
                  key={reg.id}
                  className="bg-slate-900/40 border border-white/20 backdrop-blur-xl rounded-xl p-6 hover:border-white/30 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Left: team + contact */}
                    <div className="flex-1 space-y-4 min-w-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
                          <h3 className="font-semibold text-lg truncate">
                            {reg.academy_name}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                          {reg.tournaments?.name ?? "Unknown tournament"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Ref{" "}
                          <span className="font-mono font-semibold tracking-wider text-slate-300">
                            {registrationReference(reg.id)}
                          </span>
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserRound className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-300 truncate">
                            {reg.contact_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${reg.contact_phone}`}
                            className="text-slate-300 truncate hover:text-white"
                          >
                            {reg.contact_phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${reg.contact_email}`}
                            className="text-slate-300 truncate hover:text-white"
                          >
                            {reg.contact_email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-300">
                            Registered {formatDate(reg.created_at)}
                          </span>
                        </div>
                      </div>

                      <StaffList reg={reg} />
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-2 lg:w-64 shrink-0">
                      <button
                        onClick={() => handleViewPDF(reg.receipt_pdf_url)}
                        disabled={!reg.receipt_pdf_url}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-800/30 disabled:cursor-not-allowed border border-slate-600/50 rounded-lg transition text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        View Roster PDF
                      </button>

                      <button
                        onClick={() => toggleExpanded(reg.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg transition text-sm"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {isOpen ? "Hide" : "View"} {reg.players.length} player
                        {reg.players.length === 1 ? "" : "s"}
                      </button>

                      <div className="mt-2">
                        {active ? (
                          <button
                            onClick={() => handleCancel(reg)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/80 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition font-semibold text-sm"
                          >
                            <Ban className="w-4 h-4 shrink-0" />
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(reg)}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition font-semibold text-sm"
                          >
                            <RotateCcw className="w-4 h-4 shrink-0" />
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable roster. Proof of age is stored in a private
                      bucket, so each row mints its own signed URL on click. */}
                  {isOpen && (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      {reg.players.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No players on this registration.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {reg.players.map((player, i) => (
                            <li
                              key={player.id}
                              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3"
                            >
                              <span className="w-6 shrink-0 text-center text-xs font-mono text-slate-500">
                                {i + 1}
                              </span>

                              {player.photo_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={player.photo_url}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-md object-cover border border-white/10"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-900">
                                  <UserRound className="h-4 w-4 text-slate-600" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">
                                  {player.full_name}
                                  {player.jersey_number ? (
                                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                                      #{player.jersey_number}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {[
                                    player.position,
                                    player.nationality,
                                    player.dob
                                      ? `born ${formatDate(player.dob)}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "No details recorded"}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleViewPrivateDoc(
                                    "proof-of-age",
                                    player.proof_of_age_path,
                                    "proof of age",
                                  )
                                }
                                disabled={!player.proof_of_age_path}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <IdCard className="h-3.5 w-3.5" />
                                Proof of age
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
