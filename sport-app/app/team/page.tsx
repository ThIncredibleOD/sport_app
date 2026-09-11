"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Info,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { registrationReference } from "@/lib/reference";
import EditableField from "@/components/team/EditableField";
import { PREFERRED_FOOT_OPTIONS } from "@/lib/height";
import PhotoField from "@/components/team/PhotoField";
import DocumentField from "@/components/team/DocumentField";

/* -------------------------------------------------------------------------- */
/*  Types — the shape /api/team/registration returns                          */
/* -------------------------------------------------------------------------- */

interface Player {
  id: string;
  full_name: string;
  dob: string | null;
  nationality: string | null;
  jersey_number: string | null;
  position: string | null;
  /** Unity Cup only — null on every other cup's players. */
  height_cm: string | null;
  preferred_foot: string | null;
  /** PUBLIC bucket URL — safe to render directly. */
  photo_url: string | null;
  /**
   * Whether a document is on file. The PATH is never sent to the browser: it
   * points into a private bucket holding a minor's identity document, and a
   * path that never reaches the client cannot be replayed from it.
   */
  has_proof_of_age: boolean;
  created_at: string;
}

interface Registration {
  id: string;
  academy_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  team_logo_url: string | null;
  coach_full_name: string | null;
  coach_dob: string | null;
  coach_nationality: string | null;
  coach_photo_url: string | null;
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
  receipt_pdf_url: string | null;
  created_at: string;
  tournaments: { name: string; slug: string } | null;
  players: Player[];
}

interface Notice {
  id: string;
  playerId: string | null;
  field: string;
  label: string;
  attempted: string | null;
  message: string;
}

/** One of the five people a team can register alongside its players. */
interface OfficialSlot {
  role: string;
  /** Value passed as `official` to /api/team/upload. */
  key: "manager" | "coach" | "assistant_coach" | "medic1" | "medic2";
  nameField: string;
  dobField: string;
  nationalityField: string;
  photoField: keyof Registration;
}

/**
 * In the order the registration form collects them: manager, head coach,
 * assistant coach, then the two medics.
 */
const OFFICIALS: OfficialSlot[] = [
  {
    role: "Team manager",
    key: "manager",
    nameField: "manager_full_name",
    dobField: "manager_dob",
    nationalityField: "manager_nationality",
    photoField: "manager_photo_url",
  },
  {
    role: "Head coach",
    key: "coach",
    nameField: "coach_full_name",
    dobField: "coach_dob",
    nationalityField: "coach_nationality",
    photoField: "coach_photo_url",
  },
  {
    role: "Assistant coach",
    key: "assistant_coach",
    nameField: "assistant_coach_full_name",
    dobField: "assistant_coach_dob",
    nationalityField: "assistant_coach_nationality",
    photoField: "assistant_coach_photo_url",
  },
  {
    role: "Medic 1",
    key: "medic1",
    nameField: "medic1_full_name",
    dobField: "medic1_dob",
    nationalityField: "medic1_nationality",
    photoField: "medic1_photo_url",
  },
  {
    role: "Medic 2",
    key: "medic2",
    nameField: "medic2_full_name",
    dobField: "medic2_dob",
    nationalityField: "medic2_nationality",
    photoField: "medic2_photo_url",
  },
];

/** Null-safe for the inputs, which are all controlled and take a string. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-slate-900/40 p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="h-4.5 w-4.5 shrink-0 text-green-500" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * /team — a registered team's own record, editable.
 *
 * Every field on this page is saved through a server route holding the service
 * role; the browser has no write access to these tables at all (the anon key
 * can only INSERT a new registration). The registration being edited is
 * whichever one the session cookie names — this page never sends an id, so
 * there is nothing here for one team to point at another's record.
 *
 * SOME FIELDS ARE REVIEWED BY THE ORGANISER AND THIS PAGE DOES NOT SAY WHICH.
 * See components/team/EditableField.tsx: the two modes are visually identical
 * and the saved value is echoed back either way. Don't add a badge, a tooltip,
 * a footnote or a different colour that would let a team work out which fields
 * are checked — that tells them equally which ones aren't.
 */
export default function TeamDashboardPage() {
  const router = useRouter();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/team/registration");

        if (res.status === 401) {
          router.push("/team/login");
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Could not load your registration.");
        }
        if (cancelled) return;

        const reg = data.registration as Registration;
        // Nested rows come back in no guaranteed order, so the roster is sorted
        // into the order the players were entered.
        reg.players = [...(reg.players ?? [])].sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
        );

        setRegistration(reg);
        setNotices((data.notices ?? []) as Notice[]);
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
  }, [reloadToken, router]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  /* ------------------------- Local state patching ------------------------- */
  // The server has already accepted the value by the time these run, so the
  // page updates in place instead of refetching the whole record.

  const patchRegistration = useCallback((field: string, value: string) => {
    setRegistration((prev) =>
      prev ? ({ ...prev, [field]: value } as Registration) : prev,
    );
  }, []);

  const patchPlayer = useCallback(
    (playerId: string, field: string, value: unknown) => {
      setRegistration((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.id === playerId ? ({ ...p, [field]: value } as Player) : p,
              ),
            }
          : prev,
      );
    },
    [],
  );

  async function dismissNotice(changeId: string) {
    // Removed from the list first: the request is idempotent and the note is
    // information, so a network failure shouldn't leave it stuck on screen.
    setNotices((prev) => prev.filter((n) => n.id !== changeId));
    try {
      await fetch("/api/team/dismiss-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId }),
      });
    } catch {
      /* Reappears on the next load if it didn't stick. */
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/team/logout", { method: "POST" });
    } finally {
      router.push("/team/login");
    }
  }

  /* ------------------------------- Loading -------------------------------- */
  if (loading && !registration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  /* -------------------------------- Error --------------------------------- */
  if (error && !registration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/40 p-6 text-center backdrop-blur-xl">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={handleLogout}
            className="mt-5 rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!registration) return null;

  const reg = registration;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-green-500/30 bg-green-600/20">
              <ShieldCheck className="h-5 w-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">
                {reg.academy_name}
              </h1>
              <p className="truncate text-xs text-slate-400">
                {reg.tournaments?.name ?? "Tournament"} · Ref{" "}
                <span className="font-mono tracking-wider">
                  {registrationReference(reg.id)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={reload}
              disabled={loading}
              title="Refresh"
              className="rounded-lg p-2 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-2 text-sm transition hover:bg-red-600/30"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-5 px-4 py-6 sm:py-8">
        {/* Notices: changes that did not stick. Worded in /api/team/
            registration so it can't drift into mentioning a review. */}
        {notices.length > 0 && (
          <div className="space-y-2">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
              >
                <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-400" />
                <p className="flex-1 text-sm text-amber-200">
                  {notice.message}
                </p>
                <button
                  onClick={() => dismissNotice(notice.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-md p-1 text-amber-400/70 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ------------------------------ Team ------------------------------ */}
        <Section
          title="Team details"
          subtitle="Your academy and the person the organiser contacts"
          icon={Trophy}
        >
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="shrink-0">
              <PhotoField
                label="Team logo"
                url={reg.team_logo_url}
                kind="team-logo"
                shape="square"
                onUploaded={(url) => patchRegistration("team_logo_url", url)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <EditableField
                label="Academy name"
                value={str(reg.academy_name)}
                field="academy_name"
                mode="review"
                maxLength={120}
                onSaved={(v) => patchRegistration("academy_name", v)}
              />
              <EditableField
                label="Contact name"
                value={str(reg.contact_name)}
                field="contact_name"
                mode="instant"
                maxLength={120}
                onSaved={(v) => patchRegistration("contact_name", v)}
              />
              <EditableField
                label="Contact phone"
                value={str(reg.contact_phone)}
                field="contact_phone"
                mode="review"
                type="tel"
                maxLength={20}
                onSaved={(v) => patchRegistration("contact_phone", v)}
              />
              <EditableField
                label="Contact email"
                value={str(reg.contact_email)}
                field="contact_email"
                mode="instant"
                type="email"
                maxLength={200}
                placeholder="Optional"
                onSaved={(v) => patchRegistration("contact_email", v)}
              />
            </div>
          </div>
        </Section>

        {/* ---------------------------- Officials --------------------------- */}
        <Section
          title="Team officials"
          subtitle="Leave anyone you don't have blank"
          icon={UserRound}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {OFFICIALS.map((official) => (
              <div
                key={official.key}
                className="rounded-lg border border-white/10 bg-slate-950/40 p-4"
              >
                <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {official.role}
                </p>

                <div className="flex gap-4">
                  <div className="shrink-0">
                    <PhotoField
                      label="Photo"
                      url={str(reg[official.photoField]) || null}
                      kind="official-photo"
                      official={official.key}
                      size="sm"
                      onUploaded={(url) =>
                        patchRegistration(official.photoField as string, url)
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <EditableField
                      label="Full name"
                      value={str(reg[official.nameField as keyof Registration])}
                      field={official.nameField}
                      mode="review"
                      maxLength={120}
                      placeholder="Optional"
                      compact
                      onSaved={(v) =>
                        patchRegistration(official.nameField, v)
                      }
                    />
                    <EditableField
                      label="Date of birth"
                      value={str(reg[official.dobField as keyof Registration])}
                      field={official.dobField}
                      mode="review"
                      type="date"
                      compact
                      onSaved={(v) => patchRegistration(official.dobField, v)}
                    />
                    <EditableField
                      label="Nationality"
                      value={str(
                        reg[official.nationalityField as keyof Registration],
                      )}
                      field={official.nationalityField}
                      mode="review"
                      maxLength={60}
                      placeholder="Optional"
                      compact
                      onSaved={(v) =>
                        patchRegistration(official.nationalityField, v)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ----------------------------- Players ---------------------------- */}
        <Section
          title="Players"
          subtitle={`${reg.players.length} on your roster`}
          icon={Users}
        >
          {reg.players.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No players are on this registration.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {reg.players.map((player, index) => (
                <div
                  key={player.id}
                  className="rounded-lg border border-white/10 bg-slate-950/40 p-4"
                >
                  <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    Player {index + 1}
                  </p>

                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <PhotoField
                        label="Photo"
                        url={player.photo_url}
                        kind="player-photo"
                        playerId={player.id}
                        size="sm"
                        onUploaded={(url) =>
                          patchPlayer(player.id, "photo_url", url)
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <EditableField
                        label="Full name"
                        value={str(player.full_name)}
                        field="full_name"
                        mode="review"
                        playerId={player.id}
                        maxLength={120}
                        compact
                        onSaved={(v) =>
                          patchPlayer(player.id, "full_name", v)
                        }
                      />
                      <EditableField
                        label="Date of birth"
                        value={str(player.dob)}
                        field="dob"
                        mode="review"
                        playerId={player.id}
                        type="date"
                        compact
                        onSaved={(v) => patchPlayer(player.id, "dob", v)}
                      />
                      <EditableField
                        label="Nationality"
                        value={str(player.nationality)}
                        field="nationality"
                        mode="review"
                        playerId={player.id}
                        maxLength={60}
                        placeholder="Optional"
                        compact
                        onSaved={(v) =>
                          patchPlayer(player.id, "nationality", v)
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <EditableField
                          label="Jersey"
                          value={str(player.jersey_number)}
                          field="jersey_number"
                          mode="instant"
                          playerId={player.id}
                          maxLength={3}
                          placeholder="—"
                          compact
                          onSaved={(v) =>
                            patchPlayer(player.id, "jersey_number", v)
                          }
                        />
                        <EditableField
                          label="Position"
                          value={str(player.position)}
                          field="position"
                          mode="instant"
                          playerId={player.id}
                          maxLength={40}
                          placeholder="—"
                          compact
                          onSaved={(v) =>
                            patchPlayer(player.id, "position", v)
                          }
                        />
                      </div>

                      {/* Unity Cup only. A league or secondary team never
                          sees these two boxes, because their players have no
                          height or foot to show and two permanent em-dashes
                          would only raise questions about missing data. */}
                      {reg.tournaments?.slug === "unity-cup" && (
                        <div className="grid grid-cols-2 gap-3">
                          <EditableField
                            label="Height (cm)"
                            value={str(player.height_cm)}
                            field="height_cm"
                            mode="instant"
                            playerId={player.id}
                            maxLength={3}
                            placeholder="—"
                            compact
                            onSaved={(v) =>
                              patchPlayer(player.id, "height_cm", v)
                            }
                          />
                          <EditableField
                            label="Preferred foot"
                            value={str(player.preferred_foot)}
                            field="preferred_foot"
                            mode="instant"
                            playerId={player.id}
                            options={PREFERRED_FOOT_OPTIONS}
                            placeholder="Not set"
                            compact
                            onSaved={(v) =>
                              patchPlayer(player.id, "preferred_foot", v)
                            }
                          />
                        </div>
                      )}

                      <div className="border-t border-white/5 pt-3">
                        <DocumentField
                          playerId={player.id}
                          playerName={str(player.full_name)}
                          hasDocument={player.has_proof_of_age}
                          onUploaded={() =>
                            patchPlayer(player.id, "has_proof_of_age", true)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <p className="pb-4 text-center text-xs leading-relaxed text-slate-600">
          Need a player added or removed, or something here that you can&apos;t
          change? Contact the organiser.
        </p>
      </main>
    </div>
  );
}
