"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  Inbox,
  RefreshCw,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { isDateField } from "@/lib/team-fields";

/**
 * The queue of changes teams have asked to make to their own registrations.
 *
 * Only identity fields land here — names, dates of birth, nationalities,
 * proof-of-age documents, plus the contact phone. Everything else a team edits
 * (photos, jersey numbers, positions, contact name and email) is applied
 * straight away and never appears in this list.
 *
 * WHAT THE TEAM SEES WHILE A CHANGE SITS HERE: the value they typed, as though
 * it had already applied. They are not told a review exists. Approving is
 * therefore silent — it simply makes the displayed value real. Rejecting
 * reverts their view and shows a short note saying the change could not be
 * applied. Neither outcome mentions this queue, which is why the wording lives
 * in the API and not in whatever gets typed into a message box here.
 *
 * A document change's `newValue` is a path into the PRIVATE proof-of-age
 * bucket, not a URL. It is traded for a signed URL on click, the same way the
 * roster does it.
 */

interface Change {
  id: string;
  registrationId: string;
  reference: string;
  academyName: string;
  contactName: string;
  contactPhone: string;
  tournamentName: string;
  playerId: string | null;
  playerName: string | null;
  jerseyNumber: string | null;
  field: string;
  label: string;
  isDocument: boolean;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

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

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dates are shown the way the rest of the admin shows them. */
function displayValue(change: Change, value: string | null): string {
  if (value === null || value === "") return "—";
  if (isDateField(change.field)) return formatDate(value);
  return value;
}

export default function ChangesTab({
  refreshToken,
  onCountChange,
}: {
  /** Bumped by the page's refresh button to force a reload. */
  refreshToken?: number;
  /** Lets the page header show the queue length. `setState` is stable. */
  onCountChange?: (count: number) => void;
}) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Held in a ref so the fetch effect doesn't re-run when the page passes a
  // new function identity — a refetch loop would be the result.
  const reportCount = useRef(onCountChange);
  useEffect(() => {
    reportCount.current = onCountChange;
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/pending-changes");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load changes.");
        if (cancelled) return;

        const rows = (data.changes ?? []) as Change[];
        setChanges(rows);
        setUnavailable(Boolean(data.unavailable));
        setError("");
        // Reported from here rather than from an effect watching `changes`:
        // setState called synchronously inside an effect costs a second render
        // pass of the whole page.
        reportCount.current?.(rows.length);
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
  }, [reloadToken, refreshToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  async function resolve(change: Change, action: "approve" | "reject") {
    if (
      action === "reject" &&
      !confirm(
        `Reject the change to ${change.label.toLowerCase()} for ${
          change.academyName
        }? Their record stays as it is, and they'll be told it couldn't be applied.`,
      )
    ) {
      return;
    }

    setBusyId(change.id);
    try {
      const res = await fetch("/api/admin/resolve-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId: change.id, action }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not save that.");

      // Dropped from the list rather than refetched: the decision is final and
      // the row will never come back as pending. Computed outside the updater
      // — React may run an updater twice, and it must stay side-effect free.
      const next = changes.filter((c) => c.id !== change.id);
      setChanges(next);
      reportCount.current?.(next.length);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  async function viewDocument(path: string | null) {
    if (!path) {
      alert("There is no document to open.");
      return;
    }
    try {
      const res = await fetch("/api/admin/get-receipt-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "proof-of-age", path }),
      });
      if (!res.ok) throw new Error("Could not open that document.");
      const data = await res.json();
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not open that document.",
      );
    }
  }

  /* --------------------------- Grouped by team --------------------------- */
  // A team fixing its roster usually changes several things at once, so the
  // decisions are presented together instead of interleaved with other teams'.
  const groups: { key: string; changes: Change[] }[] = [];
  const groupIndex = new Map<string, number>();
  for (const change of changes) {
    const existing = groupIndex.get(change.registrationId);
    if (existing === undefined) {
      groupIndex.set(change.registrationId, groups.length);
      groups.push({ key: change.registrationId, changes: [change] });
    } else {
      groups[existing].changes.push(change);
    }
  }

  if (loading && changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {unavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-300">
              The team portal isn&apos;t set up yet
            </p>
            <p className="text-sm text-amber-200/80">
              Run the TEAM SELF-SERVICE PORTAL block in SUPABASE_MIGRATION.sql.
              Until then teams can&apos;t sign in, so nothing can be queued here.
            </p>
          </div>
        </div>
      )}

      {changes.length === 0 && !unavailable ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox className="mb-4 h-16 w-16" />
          <p className="text-lg font-semibold">Nothing waiting</p>
          <p className="text-sm">
            Changes teams request to names, dates of birth and documents appear
            here
          </p>
        </div>
      ) : (
        groups.map((group) => {
          const first = group.changes[0];
          return (
            <div
              key={group.key}
              className="rounded-xl border border-white/20 bg-slate-900/40 p-5 backdrop-blur-xl sm:p-6"
            >
              {/* Team */}
              <div className="mb-4 border-b border-white/10 pb-4">
                <div className="mb-1 flex items-center gap-2">
                  <Trophy className="h-5 w-5 shrink-0 text-yellow-500" />
                  <h3 className="truncate text-lg font-semibold">
                    {first.academyName}
                  </h3>
                </div>
                <p className="text-sm text-slate-400">
                  {first.tournamentName || "Unknown tournament"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ref{" "}
                  <span className="font-mono font-semibold tracking-wider text-slate-300">
                    {first.reference}
                  </span>
                  {first.contactName ? ` · ${first.contactName}` : ""}
                  {first.contactPhone ? ` · ${first.contactPhone}` : ""}
                </p>
              </div>

              {/* Decisions */}
              <ul className="space-y-3">
                {group.changes.map((change) => {
                  const busy = busyId === change.id;
                  return (
                    <li
                      key={change.id}
                      className="rounded-lg border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {change.label}
                            </span>
                            {change.playerName && (
                              <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
                                <UserRound className="h-3 w-3" />
                                {change.playerName}
                                {change.jerseyNumber
                                  ? ` · #${change.jerseyNumber}`
                                  : ""}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500">
                              {formatWhen(change.createdAt)}
                            </span>
                          </div>

                          {change.isDocument ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => viewDocument(change.oldValue)}
                                disabled={!change.oldValue}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Current document
                              </button>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                              <button
                                onClick={() => viewDocument(change.newValue)}
                                disabled={!change.newValue}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-600/20 px-3 py-1.5 text-xs transition hover:bg-green-600/30 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Proposed document
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="rounded bg-slate-800/80 px-2 py-1 text-slate-400 line-through decoration-slate-600">
                                {displayValue(change, change.oldValue)}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                              <span className="rounded bg-green-600/15 px-2 py-1 font-medium text-green-300">
                                {displayValue(change, change.newValue)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => resolve(change, "approve")}
                            disabled={busy}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => resolve(change, "reject")}
                            disabled={busy}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600/80 px-4 py-2 text-sm font-semibold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}

      {changes.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
