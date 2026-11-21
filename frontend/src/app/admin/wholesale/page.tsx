"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, apiClient } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";
import {
  CheckCircle2,
  Download,
  Filter,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface WholesaleApplication {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  gstin: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: "pending" | "approved" | "rejected";
  applicant_note?: string | null;
  owner_internal_note?: string | null;
  proof_document?: {
    original_filename: string;
    mime_type: string;
  };
  created_at: string;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-amber-950 text-amber-400 border border-amber-800",
  approved: "bg-emerald-950 text-emerald-400 border border-emerald-800",
  rejected: "bg-red-950 text-red-400 border border-red-800",
};

export default function AdminWholesalePage() {
  const [apps, setApps] = useState<WholesaleApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadApps = async (filter: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await apiClient<WholesaleApplication[]>(
        `admin/wholesale-applications${qs}`
      );
      if (res.data) {
        setApps(res.data);
      } else {
        setError(res.error?.message ?? "Owner access required.");
      }
    } catch {
      setError("Failed to load wholesale applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps(statusFilter);
  }, [statusFilter]);

  const handleReview = async (
    appId: string,
    decision: "approved" | "rejected"
  ) => {
    setReviewingId(appId);
    setError(null);
    try {
      const res = await apiClient(
        `admin/wholesale-applications/${appId}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            decision,
            internal_note: notesById[appId]?.trim() || undefined,
          }),
        }
      );
      if (res.error) {
        setError(res.error.message);
      } else {
        await loadApps(statusFilter);
      }
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <AdminNav title="Wholesale GSTIN Applications" />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[#C69A48] text-black font-semibold"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading applications…
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-12 text-center text-slate-500 text-xs">
            No wholesale applications found.
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const docUrl = `${API_BASE_URL.replace(
                /\/$/,
                ""
              )}/admin/wholesale-applications/${app.id}/document`;
              return (
                <div
                  key={app.id}
                  className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-base font-serif font-bold text-white">
                        {app.business_name}
                      </h2>
                      <p className="text-slate-400">
                        GSTIN:{" "}
                        <span className="font-mono text-[#E3C27B]">
                          {app.gstin}
                        </span>{" "}
                        · Type:{" "}
                        <span className="capitalize">
                          {app.business_type.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] capitalize ${
                        STATUS_BADGES[app.status]
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Contact</span>
                      {app.contact_name}
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone</span>
                      {app.contact_phone}
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email</span>
                      {app.contact_email}
                    </div>
                  </div>

                  {app.applicant_note && (
                    <p className="text-slate-400 italic">
                      Applicant note: &ldquo;{app.applicant_note}&rdquo;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#E3C27B]" />
                      Inspect Private Proof (
                      {app.proof_document?.original_filename ?? "document"})
                    </a>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={notesById[app.id] ?? app.owner_internal_note ?? ""}
                        onChange={(e) =>
                          setNotesById((prev) => ({
                            ...prev,
                            [app.id]: e.target.value,
                          }))
                        }
                        placeholder="Owner review note (optional)"
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 w-56"
                      />
                      <button
                        type="button"
                        disabled={reviewingId === app.id}
                        onClick={() => handleReview(app.id, "approved")}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === app.id}
                        onClick={() => handleReview(app.id, "rejected")}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
