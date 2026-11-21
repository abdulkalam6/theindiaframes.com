"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Globe,
  IndianRupee,
  LogOut,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";

type SourceType = "enquiry" | "offline_sale";
type PaymentStatus = "unpaid" | "partial" | "paid";

interface BillingRecordSummary {
  source_type: SourceType;
  source_label: "Online Enquiry" | "Offline Sale";
  source_id: string;
  reference_id: string;
  customer: {
    customer_id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  record_status: string;
  currency: string;
  payable_total_paise: number;
  received_total_paise: number;
  outstanding_paise: number;
  payment_status: PaymentStatus;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface BillingSummary {
  total_records: number;
  online_enquiries_count: number;
  offline_sales_count: number;
  total_payable_paise: number;
  total_received_paise: number;
  total_outstanding_paise: number;
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
  currency: string;
}

const SOURCE_STYLES: Record<SourceType, string> = {
  enquiry: "bg-blue-950 text-blue-300 border border-blue-800",
  offline_sale: "bg-amber-950 text-[#E3C27B] border border-[#C69A48]/50",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-slate-800 text-slate-400 border border-slate-700",
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

export default function BillingDashboardPage() {
  const router = useRouter();

  const [records, setRecords] = useState<BillingRecordSummary[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<"all" | SourceType>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentStatus>(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reconMsg, setReconMsg] = useState<string | null>(null);
  const [reconBusy, setReconBusy] = useState(false);

  const handleRunReconciliation = async (repair = false) => {
    setReconBusy(true);
    setReconMsg(null);
    try {
      const res = await apiClient<{
        checked_records: number;
        consistent_records: number;
        mismatched_records: number;
        repaired_records: number;
      }>(repair ? "billing/reconciliation/repair" : "billing/reconciliation", {
        method: repair ? "POST" : "GET",
      });
      if (res.data) {
        const d = res.data;
        setReconMsg(
          d.mismatched_records === 0
            ? `Ledger verified: ${d.consistent_records}/${d.checked_records} records consistent.`
            : repair
            ? `Repaired ${d.repaired_records} mismatched record(s) from immutable ledger.`
            : `Detected ${d.mismatched_records} mismatch(es) out of ${d.checked_records} records.`
        );
      }
    } finally {
      setReconBusy(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const recordParams = new URLSearchParams();
        const summaryParams = new URLSearchParams();

        if (sourceFilter !== "all") {
          recordParams.set("source_type", sourceFilter);
          summaryParams.set("source_type", sourceFilter);
        }
        if (paymentFilter !== "all") {
          recordParams.set("payment_status", paymentFilter);
        }
        if (searchQuery.trim()) {
          recordParams.set("q", searchQuery.trim());
        }
        if (startDate) {
          const isoStart = `${startDate}T00:00:00Z`;
          recordParams.set("start_date", isoStart);
          summaryParams.set("start_date", isoStart);
        }
        if (endDate) {
          const isoEnd = `${endDate}T23:59:59Z`;
          recordParams.set("end_date", isoEnd);
          summaryParams.set("end_date", isoEnd);
        }

        const recordQs = recordParams.toString()
          ? `?${recordParams.toString()}`
          : "";
        const summaryQs = summaryParams.toString()
          ? `?${summaryParams.toString()}`
          : "";

        const [recordsRes, summaryRes] = await Promise.all([
          apiClient<BillingRecordSummary[]>(`billing/records${recordQs}`),
          apiClient<BillingSummary>(`billing/summary${summaryQs}`),
        ]);

        const detailErr =
          (recordsRes as { detail?: string }).detail ||
          (summaryRes as { detail?: string }).detail;

        if (recordsRes.data && summaryRes.data) {
          setRecords(recordsRes.data);
          setSummary(summaryRes.data);
        } else {
          setError(
            recordsRes.error?.message ||
              summaryRes.error?.message ||
              detailErr ||
              "Owner authentication required."
          );
        }
      } catch {
        setError("Failed to load billing records.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sourceFilter, paymentFilter, searchQuery, startDate, endDate]);

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/billing/login");
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <header className="border-b border-slate-800 bg-[#080f1d] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#C69A48] font-semibold uppercase tracking-widest">
            Owner Billing
          </span>
          <h1 className="text-lg font-serif font-bold text-white leading-tight">
            Unified Billing &amp; Payment Records
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <Link href="/billing" className="text-[#E3C27B] font-semibold">
              Billing
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Dashboard
            </Link>
            <Link
              href="/admin/enquiries"
              className="hover:text-white transition-colors"
            >
              Enquiries
            </Link>
          </nav>
          <button
            type="button"
            disabled={reconBusy}
            onClick={() => handleRunReconciliation(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#E3C27B] ${reconBusy ? "animate-spin" : ""}`} />
            Reconcile
          </button>
          <Link
            href="/billing/offline-sales/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Offline Sale
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {reconMsg && (
          <div className="rounded-xl bg-emerald-950/50 border border-emerald-800 px-4 py-3 text-xs text-emerald-300 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {reconMsg}
            </span>
            {reconMsg.includes("Detected") && (
              <button
                type="button"
                onClick={() => handleRunReconciliation(true)}
                className="px-3 py-1 rounded bg-[#C69A48] text-black font-semibold"
              >
                Repair Now
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-red-300">{error}</p>
            <Link
              href="/billing/login"
              className="px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs text-center shrink-0"
            >
              Sign In to Billing
            </Link>
          </div>
        )}

        {/* Summary KPIs */}
        {summary && !error && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total Payable</span>
                  <IndianRupee className="w-4 h-4 text-[#E3C27B]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatPaise(summary.total_payable_paise)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {summary.total_records} record
                  {summary.total_records !== 1 ? "s" : ""} (
                  {summary.online_enquiries_count} online ·{" "}
                  {summary.offline_sales_count} offline)
                </p>
              </div>

              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Total Received
                  </span>
                  <CircleDollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPaise(summary.total_received_paise)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {summary.paid_count} paid · {summary.partial_count} partial
                </p>
              </div>

              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Outstanding</span>
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400">
                  {formatPaise(summary.total_outstanding_paise)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {summary.unpaid_count} unpaid · {summary.partial_count}{" "}
                  partial
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        {!error && (
          <section className="rounded-xl bg-[#0b1726] border border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Source Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                {(
                  [
                    { key: "all", label: "All Sources" },
                    { key: "enquiry", label: "Online Enquiries" },
                    { key: "offline_sale", label: "Offline Sales" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSourceFilter(opt.key)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      sourceFilter === opt.key
                        ? "bg-[#C69A48] text-black font-semibold"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Payment Status Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "unpaid", "partial", "paid"] as const).map((ps) => (
                  <button
                    key={ps}
                    onClick={() => setPaymentFilter(ps)}
                    className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                      paymentFilter === ps
                        ? "bg-slate-200 text-slate-900 font-semibold"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {ps === "all" ? "All Status" : ps}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, customer name, email, or phone…"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#C69A48]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Start date"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-[#C69A48]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 shrink-0">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End date"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-[#C69A48]"
                />
              </div>
            </div>
          </section>
        )}

        {/* Unified Records Table */}
        {!error && (
          <section>
            {loading ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Loading unified billing records…
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-12 text-center text-slate-500 text-sm">
                No billing records match the selected filters.
              </div>
            ) : (
              <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left px-4 py-3">Reference</th>
                      <th className="text-left px-4 py-3">Source</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-right px-4 py-3">Payable</th>
                      <th className="text-right px-4 py-3">Received</th>
                      <th className="text-right px-4 py-3">Outstanding</th>
                      <th className="text-left px-4 py-3">Payment</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, idx) => (
                      <tr
                        key={`${rec.source_type}-${rec.source_id}`}
                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                          idx === records.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-[#E3C27B]">
                          {rec.reference_id}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                              SOURCE_STYLES[rec.source_type]
                            }`}
                          >
                            {rec.source_type === "enquiry" ? (
                              <Globe className="w-3 h-3" />
                            ) : (
                              <Store className="w-3 h-3" />
                            )}
                            {rec.source_label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200">{rec.customer.name}</p>
                          {(rec.customer.phone || rec.customer.email) && (
                            <p className="text-slate-500 text-[11px]">
                              {rec.customer.phone || rec.customer.email}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(rec.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200 font-medium">
                          {formatPaise(rec.payable_total_paise)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          {formatPaise(rec.received_total_paise)}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-medium">
                          {formatPaise(rec.outstanding_paise)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                              PAYMENT_STYLES[rec.payment_status]
                            }`}
                          >
                            {rec.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/billing/records/${rec.source_type}/${rec.source_id}`}
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
        )}
      </main>
    </div>
  );
}
