"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";
import { Filter } from "lucide-react";

interface EnquiryItem {
  id: string;
  enquiry_id: string;
  customer_snapshot: {
    name: string;
    email: string;
    phone?: string | null;
    account_type_at_submission: string;
  };
  pricing_tier: "retail" | "wholesale";
  enquiry_status: string;
  created_at: string;
  estimated_total_paise: number;
  quoted_total_paise?: number | null;
  payment_summary: {
    received_total_paise: number;
    outstanding_paise: number;
    payment_status: "unpaid" | "partial" | "paid";
  };
  items: Array<{
    product_name: string;
    quantity: number;
    custom_photo?: { asset_id: string } | null;
  }>;
}

const STATUS_OPTIONS = [
  "all",
  "pending",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-950 text-amber-400 border border-amber-800",
  quoted: "bg-blue-950 text-blue-400 border border-blue-800",
  accepted: "bg-cyan-950 text-cyan-400 border border-cyan-800",
  in_progress: "bg-violet-950 text-violet-400 border border-violet-800",
  completed: "bg-emerald-950 text-emerald-400 border border-emerald-800",
  cancelled: "bg-slate-800 text-slate-500 border border-slate-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  unpaid: "bg-slate-800 text-slate-400",
  partial: "bg-amber-950 text-amber-400 border border-amber-800",
  paid: "bg-emerald-950 text-emerald-400 border border-emerald-800",
};

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
        const res = await apiClient<EnquiryItem[]>(`admin/enquiries${qs}`);
        if (res.data) {
          setEnquiries(res.data);
        } else {
          setError(res.error?.message ?? "Access denied.");
        }
      } catch {
        setError("Failed to load enquiries.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <AdminNav title="Enquiries" />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[#C69A48] text-black font-semibold"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Loading enquiries…
          </div>
        ) : enquiries.length === 0 ? (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-12 text-center text-slate-500 text-sm">
            No enquiries found
            {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </div>
        ) : (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-4 py-3">Enquiry ID</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-left px-4 py-3">Enquiry Status</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Payable</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq, idx) => (
                  <tr
                    key={enq.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      idx === enquiries.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[#E3C27B]">
                      {enq.enquiry_id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200">
                        {enq.customer_snapshot.name}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {enq.customer_snapshot.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span>
                        {enq.items.length} item
                        {enq.items.length !== 1 ? "s" : ""}
                      </span>
                      {enq.items.some((i) => i.custom_photo) && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#C69A48]/20 border border-[#C69A48]/40 text-[#E3C27B] text-[10px] font-semibold">
                          Photo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                          STATUS_STYLES[enq.enquiry_status] ??
                          "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {enq.enquiry_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                          PAYMENT_STYLES[enq.payment_summary.payment_status] ??
                          "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {enq.payment_summary.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(enq.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {formatPaise(
                        enq.quoted_total_paise ?? enq.estimated_total_paise
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/enquiries/${enq.id}`}
                        className="text-[#E3C27B] hover:text-white text-[11px]"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
