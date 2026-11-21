"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  ShoppingBag,
  Users,
} from "lucide-react";

interface EnquirySnapshot {
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
}

interface DashboardSummary {
  total_enquiries: number;
  pending_enquiries: number;
  total_products: number;
  total_wholesale_pending: number;
  total_customers: number;
  recent_enquiries: EnquirySnapshot[];
}

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient<DashboardSummary>("admin/dashboard");
        if (res.data) {
          setSummary(res.data);
        } else {
          setError(res.error?.message ?? "Access denied.");
        }
      } catch {
        setError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060e1a] flex items-center justify-center text-slate-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-[#060e1a] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error ?? "Unknown error"}</p>
        <Link href="/login" className="text-[#E3C27B] text-xs underline">
          Go to Login
        </Link>
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Enquiries",
      value: summary.total_enquiries,
      icon: ClipboardList,
      color: "text-blue-400",
    },
    {
      label: "Pending Enquiries",
      value: summary.pending_enquiries,
      icon: BarChart3,
      color: "text-amber-400",
    },
    {
      label: "Total Products",
      value: summary.total_products,
      icon: ShoppingBag,
      color: "text-emerald-400",
    },
    {
      label: "Wholesale Pending",
      value: summary.total_wholesale_pending,
      icon: Users,
      color: "text-violet-400",
    },
    {
      label: "Customers",
      value: summary.total_customers,
      icon: Users,
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <header className="border-b border-slate-800 bg-[#080f1d] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#C69A48] font-semibold uppercase tracking-widest">
            Owner Panel
          </span>
          <h1 className="text-lg font-serif font-bold text-white leading-tight">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <Link href="/admin" className="text-[#E3C27B] font-semibold">
              Dashboard
            </Link>
            <Link
              href="/admin/enquiries"
              className="hover:text-white transition-colors"
            >
              Enquiries
            </Link>
            <Link
              href="/admin/customers"
              className="hover:text-white transition-colors"
            >
              Customers
            </Link>
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section>
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl bg-[#0b1726] border border-slate-800 p-5 space-y-2"
              >
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest">
              Recent Enquiries
            </h2>
            <Link
              href="/admin/enquiries"
              className="text-xs text-[#E3C27B] hover:text-white transition-colors"
            >
              View All →
            </Link>
          </div>

          {summary.recent_enquiries.length === 0 ? (
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-10 text-center text-slate-500 text-sm">
              No enquiries yet.
            </div>
          ) : (
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-4 py-3">Enquiry ID</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Enquiry Status</th>
                    <th className="text-left px-4 py-3">Payment</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Payable</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_enquiries.map((enq, idx) => (
                    <tr
                      key={enq.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                        idx === summary.recent_enquiries.length - 1
                          ? "border-b-0"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[#E3C27B]">
                        {enq.enquiry_id}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {enq.customer_snapshot.name}
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
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
