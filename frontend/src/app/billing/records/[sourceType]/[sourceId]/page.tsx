"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { ArrowLeft, Globe, LogOut, Receipt, Store } from "lucide-react";

type SourceType = "enquiry" | "offline_sale";
type PaymentStatus = "unpaid" | "partial" | "paid";

interface BillingLineItem {
  product_id?: string | null;
  variant_id?: string | null;
  sku?: string | null;
  product_name: string;
  variant_label?: string | null;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
}

interface PaymentEntry {
  id: string;
  payment_id: string;
  source_type: SourceType;
  source_id: string;
  entry_type: "receipt" | "reversal";
  reversed_payment_id?: string | null;
  amount_paise: number;
  currency: string;
  method: "cash" | "upi" | "bank_transfer" | "card" | "other";
  reference_number?: string | null;
  paid_at: string;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

interface BillingRecordDetail {
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
  subtotal_paise: number;
  discount_paise: number;
  tax_amount_paise?: number | null;
  estimated_total_paise?: number | null;
  quoted_total_paise?: number | null;
  payable_total_paise: number;
  received_total_paise: number;
  outstanding_paise: number;
  payment_status: PaymentStatus;
  item_count: number;
  items: BillingLineItem[];
  notes?: string | null;
  payments: PaymentEntry[];
  created_at: string;
  updated_at: string;
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BillingRecordDetailContent() {
  const params = useParams();
  const router = useRouter();
  const sourceType = params.sourceType as string;
  const sourceId = params.sourceId as string;

  const [record, setRecord] = useState<BillingRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient<BillingRecordDetail>(
          `billing/records/${sourceType}/${sourceId}`
        );
        const detailErr = (res as { detail?: string }).detail;
        if (res.data) {
          setRecord(res.data);
        } else {
          setError(
            res.error?.message || detailErr || "Billing record not found."
          );
        }
      } catch {
        setError("Failed to load billing record.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sourceType, sourceId]);

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
            Billing Record Detail
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

      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Unified Billing
        </Link>

        {loading && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Loading billing record…
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && record && (
          <div className="space-y-8">
            {/* Header Summary */}
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-mono text-[#E3C27B] text-base font-bold">
                      {record.reference_id}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                        SOURCE_STYLES[record.source_type]
                      }`}
                    >
                      {record.source_type === "enquiry" ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Store className="w-3 h-3" />
                      )}
                      {record.source_label}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Created {formatDateTime(record.created_at)} · Record status:{" "}
                    <span className="capitalize text-slate-200">
                      {record.record_status.replace("_", " ")}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs capitalize ${
                      PAYMENT_STYLES[record.payment_status]
                    }`}
                  >
                    {record.payment_status}
                  </span>
                  {record.source_type === "enquiry" && (
                    <Link
                      href={`/admin/enquiries/${record.source_id}`}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                    >
                      Open in Admin →
                    </Link>
                  )}
                </div>
              </div>

              {/* Financial Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-lg bg-[#071421] border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    Payable Total
                  </span>
                  <span className="text-lg font-bold text-white">
                    {formatPaise(record.payable_total_paise)}
                  </span>
                  {record.source_type === "enquiry" &&
                    record.quoted_total_paise !== null &&
                    record.quoted_total_paise !== undefined && (
                      <span className="text-[11px] text-[#E3C27B] block mt-0.5">
                        Owner quoted basis (est.{" "}
                        {formatPaise(record.estimated_total_paise ?? 0)})
                      </span>
                    )}
                </div>

                <div className="p-4 rounded-lg bg-[#071421] border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    Received Total
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatPaise(record.received_total_paise)}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-[#071421] border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    Outstanding Balance
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatPaise(record.outstanding_paise)}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <span className="text-slate-200 font-medium">
                    {record.customer.name}
                  </span>
                </div>
                {record.customer.email && (
                  <div>
                    <span className="text-slate-500 block">Email</span>
                    <span className="text-slate-200">
                      {record.customer.email}
                    </span>
                  </div>
                )}
                {record.customer.phone && (
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="text-slate-200">
                      {record.customer.phone}
                    </span>
                  </div>
                )}
              </div>

              {record.notes && (
                <div className="pt-4 border-t border-slate-800 text-xs">
                  <span className="text-slate-500 block mb-1">Notes</span>
                  <p className="text-slate-300 italic">{record.notes}</p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Snapshot Line Items
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-6 py-3">Item</th>
                    <th className="text-left px-6 py-3">SKU</th>
                    <th className="text-center px-6 py-3">Qty</th>
                    <th className="text-right px-6 py-3">Unit Price</th>
                    <th className="text-right px-6 py-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((item, idx) => (
                    <tr
                      key={`${item.sku ?? item.product_name}-${idx}`}
                      className={`border-b border-slate-800/50 ${
                        idx === record.items.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-3">
                        <p className="text-slate-200">{item.product_name}</p>
                        {item.variant_label && (
                          <p className="text-slate-500 text-[11px]">
                            {item.variant_label}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-400">
                        {item.sku || "—"}
                      </td>
                      <td className="px-6 py-3 text-center text-slate-300">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-300">
                        {formatPaise(item.unit_price_paise)}
                      </td>
                      <td className="px-6 py-3 text-right text-white font-semibold">
                        {formatPaise(item.line_total_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-800 text-slate-400">
                    <td colSpan={4} className="px-6 py-2.5 text-right">
                      Subtotal
                    </td>
                    <td className="px-6 py-2.5 text-right text-slate-200">
                      {formatPaise(record.subtotal_paise)}
                    </td>
                  </tr>
                  {record.discount_paise > 0 && (
                    <tr className="text-slate-400">
                      <td colSpan={4} className="px-6 py-2 text-right">
                        Discount
                      </td>
                      <td className="px-6 py-2 text-right text-emerald-400">
                        -{formatPaise(record.discount_paise)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-800">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-right font-semibold text-slate-300"
                    >
                      Payable Total
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-white">
                      {formatPaise(record.payable_total_paise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Immutable Payment Ledger */}
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#C69A48]" />
                  Payment Ledger History
                </h3>
                <span className="text-[11px] text-slate-500">
                  {record.payments.length} entr
                  {record.payments.length === 1 ? "y" : "ies"}
                </span>
              </div>

              {record.payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No payment receipts recorded for this{" "}
                  {record.source_label.toLowerCase()} yet.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left px-6 py-3">Payment ID</th>
                      <th className="text-left px-6 py-3">Type</th>
                      <th className="text-left px-6 py-3">Method</th>
                      <th className="text-left px-6 py-3">Reference</th>
                      <th className="text-left px-6 py-3">Paid At (IST)</th>
                      <th className="text-right px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.payments.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-800/50 ${
                          idx === record.payments.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-6 py-3 font-mono text-[#E3C27B]">
                          {p.payment_id}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                              p.entry_type === "reversal"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            }`}
                          >
                            {p.entry_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 capitalize text-slate-300">
                          {p.method.replace("_", " ")}
                        </td>
                        <td className="px-6 py-3 text-slate-400">
                          {p.reference_number || "—"}
                        </td>
                        <td className="px-6 py-3 text-slate-500">
                          {formatDateTime(p.paid_at)}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            p.entry_type === "reversal"
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {p.entry_type === "reversal" ? "-" : "+"}
                          {formatPaise(p.amount_paise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BillingRecordDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060e1a] flex items-center justify-center text-slate-400 text-sm">
          Loading billing record…
        </div>
      }
    >
      <BillingRecordDetailContent />
    </Suspense>
  );
}
