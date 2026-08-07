"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  LogOut,
  RefreshCw,
  Users,
  Calendar,
  Mail,
  Phone,
  Trophy,
  AlertCircle,
} from "lucide-react";

interface Registration {
  id: string;
  academy_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  payment_receipt_path: string | null;
  receipt_pdf_url: string;
  payment_status: string;
  created_at: string;
  tournaments: {
    name: string;
    slug: string;
  };
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchPending() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pending-registrations");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch pending registrations");
      }
      const data = await res.json();
      setRegistrations(data.registrations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleApprove(regId: string) {
    if (!confirm("Approve this payment?")) return;
    setActionLoading(regId);
    try {
      const res = await fetch("/api/admin/approve-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      await fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(regId: string) {
    if (!confirm("Reject this payment? This action cannot be undone.")) return;
    setActionLoading(regId);
    try {
      const res = await fetch("/api/admin/reject-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      await fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleViewReceipt(
    bucket: string,
    path: string | null,
    label: string,
  ) {
    if (!path) {
      alert(`${label} not available`);
      return;
    }
    try {
      const res = await fetch("/api/admin/get-receipt-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path }),
      });
      if (!res.ok) throw new Error("Failed to get signed URL");
      const data = await res.json();
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open receipt");
    }
  }

  function handleViewPDF(url: string) {
    if (!url) {
      alert("Registration receipt PDF not available");
      return;
    }
    window.open(url, "_blank");
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero.png"
          alt=""
          fill
          className="object-cover opacity-20"
          priority
        />
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Payment Approvals</h1>
              <p className="text-xs text-slate-400">
                {registrations.length} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPending}
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
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
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
            <CheckCircle2 className="w-16 h-16 mb-4" />
            <p className="text-lg font-semibold">All caught up!</p>
            <p className="text-sm">No pending payment verifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-slate-900/40 border border-white/20 backdrop-blur-xl rounded-xl p-6 hover:border-white/30 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Left: Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-semibold text-lg">
                          {reg.academy_name}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-400">
                        {reg.tournaments.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        ID: {reg.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {reg.contact_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {reg.contact_phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {reg.contact_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {new Date(reg.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 lg:w-64">
                    <button
                      onClick={() =>
                        handleViewReceipt(
                          "receipts",
                          reg.payment_receipt_path,
                          "Payment receipt",
                        )
                      }
                      disabled={!reg.payment_receipt_path}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-800/30 disabled:cursor-not-allowed border border-slate-600/50 rounded-lg transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Receipt
                    </button>

                    <button
                      onClick={() => handleViewPDF(reg.receipt_pdf_url)}
                      disabled={!reg.receipt_pdf_url}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-800/30 disabled:cursor-not-allowed border border-slate-600/50 rounded-lg transition text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View Roster PDF
                    </button>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleApprove(reg.id)}
                        disabled={actionLoading === reg.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition font-semibold text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(reg.id)}
                        disabled={actionLoading === reg.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition font-semibold text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
