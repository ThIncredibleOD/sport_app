"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, AlertCircle } from "lucide-react";


function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

// 1. Move your main logic into a child component
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to land after a successful login, as handed over by proxy.ts.
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }

      // The session cookie is set by the response to the call above —
      // httpOnly, so nothing here can or should touch it. This used to also
      // write a readable `admin_token=authenticated` cookie for one
      // client-side check in the Unity Cup flow; that check is gone (proxy.ts
      // gates the route properly now), and with it the forgeable cookie.
      const destination = redirectTo || "/admin/approvals";
      router.push(destination);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 border border-white/20 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Authentication</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            {redirectTo
              ? "Sign in as admin to access restricted tournament registration"
              : "Enter your password to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="Enter admin password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-green-600/20"
          >
            {loading ? "Verifying..." : "Authenticate & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. Export default wrapper with Suspense
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}