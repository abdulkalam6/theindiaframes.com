"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  Globe,
  LogOut,
  PlusCircle,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Store,
} from "lucide-react";

type SourceType = "enquiry" | "offline_sale";
type PaymentStatus = "unpaid" | "partial" | "paid";
type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "other";

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
  method: PaymentMethod;
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

interface PaymentRecordResult {
  payment: PaymentEntry;
  billing_record: BillingRecordDetail;
  idempotent_replay: boolean;
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

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

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

function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function BillingRecordDetailContent() {
  const params = useParams();
  const router = useRouter();
  const sourceType = params.sourceType as string;
  const sourceId = params.sourceId as string;

  const [record, setRecord] = useState<BillingRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add payment receipt form state
  const [payAmountRupees, setPayAmountRupees] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("upi");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payIdemKey, setPayIdemKey] = useState(() => newIdempotencyKey("rcpt"));
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Reversal modal/inline state
  const [reversingReceipt, setReversingReceipt] = useState<PaymentEntry | null>(
    null
  );
  const [revNotes, setRevNotes] = useState("");
  const [revSubmitting, setRevSubmitting] = useState(false);

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
          if (res.data.outstanding_paise > 0) {
            setPayAmountRupees((res.data.outstanding_paise / 100).toFixed(2));
          }
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

  // Compute how much of each receipt has already been reversed
  const reversedTotalsByReceiptId: Record<string, number> = {};
  if (record) {
    for (const p of record.payments) {
      if (p.entry_type === "reversal" && p.reversed_payment_id) {
        reversedTotalsByReceiptId[p.reversed_payment_id] =
          (reversedTotalsByReceiptId[p.reversed_payment_id] || 0) +
          p.amount_paise;
      }
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setPayFeedback(null);

    const amountPaise = Math.round(parseFloat(payAmountRupees) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      setPayFeedback({ type: "error", text: "Enter a positive payment amount." });
      return;
    }

    setPaySubmitting(true);
    try {
      const res = await apiClient<PaymentRecordResult>(
        `billing/records/${record.source_type}/${record.source_id}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            entry_type: "receipt",
            amount_paise: amountPaise,
            method: payMethod,
            reference_number: payReference.trim() || undefined,
            notes: payNotes.trim() || undefined,
            idempotency_key: payIdemKey,
          }),
        }
      );
      const detailErr = (res as { detail?: string }).detail;
      if (res.data) {
        setRecord(res.data.billing_record);
        setPayFeedback({
          type: "success",
          text: `Receipt ${res.data.payment.payment_id} recorded (${formatPaise(
            res.data.payment.amount_paise
          )}).`,
        });
        setPayReference("");
        setPayNotes("");
        setPayAmountRupees(
          res.data.billing_record.outstanding_paise > 0
            ? (res.data.billing_record.outstanding_paise / 100).toFixed(2)
            : ""
        );
        setPayIdemKey(newIdempotencyKey("rcpt"));
      } else {
        setPayFeedback({
          type: "error",
          text: res.error?.message || detailErr || "Failed to record payment.",
        });
      }
    } catch {
      setPayFeedback({
        type: "error",
        text: "Network error while recording payment.",
      });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleConfirmReversal = async () => {
    if (!record || !reversingReceipt) return;
    setRevSubmitting(true);
    setPayFeedback(null);

    try {
      const res = await apiClient<PaymentRecordResult>(
        `billing/records/${record.source_type}/${record.source_id}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            entry_type: "reversal",
            reversed_payment_id: reversingReceipt.id,
            method: reversingReceipt.method,
            notes:
              revNotes.trim() ||
              `Reversal of ${reversingReceipt.payment_id}`,
            idempotency_key: newIdempotencyKey("rev"),
          }),
        }
      );
      const detailErr = (res as { detail?: string }).detail;
      if (res.data) {
        setRecord(res.data.billing_record);
        setPayFeedback({
          type: "success",
          text: `Reversal ${res.data.payment.payment_id} recorded. Original receipt preserved in ledger.`,
        });
        setReversingReceipt(null);
        setRevNotes("");
        setPayAmountRupees(
          res.data.billing_record.outstanding_paise > 0
            ? (res.data.billing_record.outstanding_paise / 100).toFixed(2)
            : ""
        );
      } else {
        setPayFeedback({
          type: "error",
          text: res.error?.message || detailErr || "Failed to reverse payment.",
        });
      }
    } catch {
      setPayFeedback({
        type: "error",
        text: "Network error while reversing payment.",
      });
    } finally {
      setRevSubmitting(false);
    }
  };

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

            {/* Record Payment Form */}
            {payFeedback && (
              <div
                className={`rounded-xl p-4 text-xs flex items-center gap-2 border ${
                  payFeedback.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-red-950/60 border-red-800 text-red-300"
                }`}
              >
                {payFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{payFeedback.text}</span>
              </div>
            )}

            {record.outstanding_paise > 0 && record.record_status !== "voided" && (
              <form
                onSubmit={handleRecordPayment}
                className="rounded-xl bg-[#0b1726] border border-[#C69A48]/30 p-6 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#C69A48]" />
                    Record Payment Receipt
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setPayAmountRupees(
                        (record.outstanding_paise / 100).toFixed(2)
                      )
                    }
                    className="text-[11px] text-[#E3C27B] hover:underline"
                  >
                    Fill Full Outstanding ({formatPaise(record.outstanding_paise)})
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={(record.outstanding_paise / 100).toFixed(2)}
                      required
                      value={payAmountRupees}
                      onChange={(e) => setPayAmountRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#C69A48]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) =>
                        setPayMethod(e.target.value as PaymentMethod)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#C69A48]"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Reference Number (optional)
                    </label>
                    <input
                      type="text"
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      placeholder="UPI / NEFT / Receipt ref"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#C69A48]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-slate-400 mb-1">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="e.g. Advance payment, partial settlement"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#C69A48]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={paySubmitting}
                    className="px-5 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] disabled:opacity-50 text-black font-semibold transition-colors shrink-0"
                  >
                    {paySubmitting ? "Recording…" : "Add Receipt"}
                  </button>
                </div>
              </form>
            )}

            {/* Reversal Confirmation Box */}
            {reversingReceipt && (
              <div className="rounded-xl bg-red-950/40 border border-red-800 p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-red-300 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reverse Receipt {reversingReceipt.payment_id} (
                    {formatPaise(
                      reversingReceipt.amount_paise -
                        (reversedTotalsByReceiptId[reversingReceipt.id] || 0)
                    )}
                    )
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setReversingReceipt(null);
                      setRevNotes("");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-slate-400">
                  This creates a new immutable reversal entry in the ledger. The
                  original receipt remains permanently preserved.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={revNotes}
                    onChange={(e) => setRevNotes(e.target.value)}
                    placeholder="Reason for reversal (e.g. failed UPI transfer, mistaken entry)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={revSubmitting}
                    onClick={handleConfirmReversal}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold"
                  >
                    {revSubmitting ? "Reversing…" : "Confirm Reversal"}
                  </button>
                </div>
              </div>
            )}

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
                  Immutable Payment Ledger
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
                      <th className="text-left px-6 py-3">Ref / Notes</th>
                      <th className="text-left px-6 py-3">Paid At (IST)</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.payments.map((p, idx) => {
                      const alreadyRev = reversedTotalsByReceiptId[p.id] || 0;
                      const canReverse =
                        p.entry_type === "receipt" &&
                        p.amount_paise - alreadyRev > 0;

                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-slate-800/50 ${
                            idx === record.payments.length - 1
                              ? "border-b-0"
                              : ""
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
                            {p.reference_number && (
                              <span className="font-mono text-[11px] text-slate-300 block">
                                {p.reference_number}
                              </span>
                            )}
                            {p.notes ? (
                              <span className="text-[11px] text-slate-500">
                                {p.notes}
                              </span>
                            ) : !p.reference_number ? (
                              "—"
                            ) : null}
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
                          <td className="px-4 py-3 text-right">
                            {canReverse ? (
                              <button
                                type="button"
                                onClick={() => setReversingReceipt(p)}
                                className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                              >
                                <RotateCcw className="w-3 h-3" /> Reverse
                              </button>
                            ) : p.entry_type === "receipt" ? (
                              <span className="text-[10px] text-slate-600">
                                Reversed
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
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
