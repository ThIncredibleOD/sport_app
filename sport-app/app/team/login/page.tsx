"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * /team/login — a registered team signs in to correct its own entry.
 *
 * Two fields, because one wouldn't be enough. The reference is printed on the
 * roster summary PDF and read out at the desk, so it is an identifier rather
 * than a password (lib/reference.ts says as much). The phone number on the
 * registration is the second half: something the team always knows and the
 * organiser never has to hand out.
 *
 * Every failure gets one message, chosen by the server — see
 * /api/team/login. This page must not add detail to it.
 */
export default function TeamLoginPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!reference.trim() || !phone.trim()) {
      setError("Please enter both your reference and your phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        setLoading(false);
        return;
      }

      router.push("/team");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-600/20">
            <ShieldCheck className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Team Portal</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to update your team&apos;s details and photos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Registration reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              // uppercase in the field itself, since that is how it is printed
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 font-mono tracking-widest text-white uppercase placeholder-slate-500 transition focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="A1B2C3D4"
              maxLength={12}
              disabled={loading}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              The 8-character code at the top of your roster summary.
            </p>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Registered phone number
            </label>
            <input
              id="phone"
              // "tel" brings up the phone keypad on a mobile, which is what
              // nearly everyone will be using here.
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="08012345678"
              maxLength={20}
              disabled={loading}
              autoComplete="tel"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              The number you gave when you registered.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs leading-relaxed text-slate-500">
          Can&apos;t find your reference, or changed your phone number? Contact
          the organiser — they can look your team up.
        </p>

        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
