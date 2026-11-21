"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL, apiClient } from "@/lib/api";
import { ArrowLeft, Download, Image as ImageIcon, LogOut } from "lucide-react";

interface CustomPhotoSnapshot {
  asset_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  edit_settings?: Record<string, string | number | boolean | null>;
}

interface EnquiryItem {
  product_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  variant_label: string;
  custom_photo?: CustomPhotoSnapshot | null;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
}

interface StatusHistory {
  status: string;
  changed_by?: string | null;
  changed_at: string;
  note?: string | null;
}

interface EnquiryDetail {
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
  items: EnquiryItem[];
  status_history: StatusHistory[];
  customer_note?: string | null;
}

const STATUS_OPTIONS = [
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

function AdminEnquiryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const enquiryId = params.id as string;

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [quotedRupees, setQuotedRupees] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [quoteUpdating, setQuoteUpdating] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detailRes = await apiClient<EnquiryDetail>(
          `admin/enquiries/${enquiryId}`
        );
        if (detailRes.data) {
          setEnquiry(detailRes.data);
          setNewStatus(detailRes.data.enquiry_status);
          if (
            detailRes.data.quoted_total_paise !== undefined &&
            detailRes.data.quoted_total_paise !== null
          ) {
            setQuotedRupees(
              (detailRes.data.quoted_total_paise / 100).toFixed(2)
            );
          }
        } else {
          setError(detailRes.error?.message ?? "Enquiry not found.");
        }
      } catch {
        setError("Failed to load enquiry.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enquiryId]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !enquiry) return;
    setStatusUpdating(true);
    setStatusMsg(null);
    try {
      const res = await apiClient<EnquiryDetail>(
        `admin/enquiries/${enquiry.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: newStatus,
            note: statusNote || undefined,
          }),
        }
      );
      if (res.data) {
        setEnquiry(res.data);
        setStatusMsg("Status updated successfully.");
        setStatusNote("");
      } else {
        setStatusMsg(res.error?.message ?? "Update failed.");
      }
    } catch {
      setStatusMsg("Network error.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleQuoteUpdate = async () => {
    if (!enquiry) return;
    const paise = Math.round(parseFloat(quotedRupees) * 100);
    if (isNaN(paise) || paise < 0) {
      setQuoteMsg("Enter a valid amount.");
      return;
    }
    setQuoteUpdating(true);
    setQuoteMsg(null);
    try {
      const res = await apiClient<EnquiryDetail>(
        `admin/enquiries/${enquiry.id}/quote`,
        {
          method: "PATCH",
          body: JSON.stringify({
            quoted_total_paise: paise,
            note: quoteNote || undefined,
          }),
        }
      );
      if (res.data) {
        setEnquiry(res.data);
        setQuoteMsg("Quote updated successfully.");
        setQuoteNote("");
      } else {
        setQuoteMsg(res.error?.message ?? "Update failed.");
      }
    } catch {
      setQuoteMsg("Network error.");
    } finally {
      setQuoteUpdating(false);
    }
  };

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <header className="border-b border-slate-800 bg-[#080f1d] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#C69A48] font-semibold uppercase tracking-widest">
            Owner Panel
          </span>
          <h1 className="text-lg font-serif font-bold text-white leading-tight">
            Enquiry Detail
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <Link href="/admin" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/admin/enquiries"
              className="text-[#E3C27B] font-semibold"
            >
              Enquiries
            </Link>
            <Link
              href="/admin/customers"
              className="hover:text-white transition-colors"
            >
              Customers
            </Link>
            <Link
              href="/billing"
              className="hover:text-white transition-colors"
            >
              Billing
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
          href="/admin/enquiries"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Enquiries
        </Link>

        {loading && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Loading enquiry…
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && enquiry && (
          <div className="space-y-8">
            {/* Enquiry Header */}
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-mono text-[#E3C27B] text-sm font-bold">
                    {enquiry.enquiry_id}
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Created {formatDateTime(enquiry.created_at)} ·{" "}
                    <span className="capitalize">
                      {enquiry.pricing_tier} tier
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs capitalize ${
                      STATUS_STYLES[enquiry.enquiry_status] ??
                      "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {enquiry.enquiry_status.replace("_", " ")}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs capitalize ${
                      PAYMENT_STYLES[enquiry.payment_summary.payment_status] ??
                      "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Payment: {enquiry.payment_summary.payment_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <span className="text-slate-200">
                    {enquiry.customer_snapshot.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-200">
                    {enquiry.customer_snapshot.email}
                  </span>
                </div>
                {enquiry.customer_snapshot.phone && (
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="text-slate-200">
                      {enquiry.customer_snapshot.phone}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block">Estimated Total</span>
                  <span className="text-white font-semibold">
                    {formatPaise(enquiry.estimated_total_paise)}
                  </span>
                </div>
                {enquiry.quoted_total_paise !== undefined &&
                  enquiry.quoted_total_paise !== null && (
                    <div>
                      <span className="text-slate-500 block">Quoted Total</span>
                      <span className="text-[#E3C27B] font-semibold">
                        {formatPaise(enquiry.quoted_total_paise)}
                      </span>
                    </div>
                  )}
                <div>
                  <span className="text-slate-500 block">
                    Received / Outstanding
                  </span>
                  <span className="text-slate-200">
                    {formatPaise(enquiry.payment_summary.received_total_paise)}{" "}
                    /{" "}
                    <span className="text-amber-400">
                      {formatPaise(enquiry.payment_summary.outstanding_paise)}
                    </span>
                  </span>
                </div>
              </div>

              {enquiry.customer_note && (
                <div className="pt-4 border-t border-slate-800 text-xs">
                  <span className="text-slate-500 block mb-1">
                    Customer Notes
                  </span>
                  <p className="text-slate-300 italic">
                    {enquiry.customer_note}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Uploaded Print-Ready Photos */}
            {enquiry.items.some((it) => it.custom_photo) && (
              <div className="rounded-xl bg-[#0b1726] border border-[#C69A48]/40 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-semibold text-[#E3C27B] uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#C69A48]" />
                    Customer Uploaded Photos (Ready for Print &amp; Framing)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Click download to save full-resolution edited photo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enquiry.items
                    .filter((it) => it.custom_photo)
                    .map((it, idx) => {
                      const cp = it.custom_photo!;
                      const base = API_BASE_URL.replace(/\/$/, "");
                      const previewUrl = `${base}/admin/enquiries/${enquiry.id}/photos/${cp.asset_id}?inline=true`;
                      const downloadUrl = `${base}/admin/enquiries/${enquiry.id}/photos/${cp.asset_id}`;
                      const sizeKb = (cp.size_bytes / 1024).toFixed(1);
                      const settings = cp.edit_settings || {};

                      return (
                        <div
                          key={`${cp.asset_id}-${idx}`}
                          className="rounded-xl bg-[#071421] border border-slate-800 p-4 flex flex-col sm:flex-row gap-4 items-start"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt={`Customer photo for ${it.product_name}`}
                            className="w-full sm:w-32 h-40 object-contain rounded-lg bg-[#060e1a] border border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-2 text-xs">
                            <div>
                              <p className="font-semibold text-white">
                                {it.product_name}
                              </p>
                              <p className="text-slate-400 text-[11px]">
                                {it.variant_label} ({it.sku}) &times;{" "}
                                {it.quantity}
                              </p>
                            </div>

                            <p className="text-[11px] text-slate-400 truncate">
                              File:{" "}
                              <span className="text-slate-200 font-mono">
                                {cp.original_filename}
                              </span>{" "}
                              ({sizeKb} KB)
                            </p>

                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {settings.orientation && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                                  {String(settings.orientation)}
                                </span>
                              )}
                              {settings.matColor && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                                  Mat: {String(settings.matColor)}
                                </span>
                              )}
                              {settings.preset &&
                                settings.preset !== "original" && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                                    {String(settings.preset)}
                                  </span>
                                )}
                              {settings.printWidthPx &&
                                settings.printHeightPx && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                    {String(settings.printWidthPx)}×
                                    {String(settings.printHeightPx)}px
                                  </span>
                                )}
                            </div>

                            {settings.texts && (
                              <p className="text-[11px] text-[#E3C27B]">
                                Text overlay: &ldquo;{String(settings.texts)}
                                &rdquo;
                              </p>
                            )}

                            <div className="pt-1 flex flex-wrap gap-2">
                              <a
                                href={downloadUrl}
                                download={cp.original_filename}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download Photo
                              </a>
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                              >
                                Open Full Size
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-x-auto">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Order Items
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-6 py-3">Product / Variant</th>
                    <th className="text-left px-6 py-3">SKU</th>
                    <th className="text-center px-6 py-3">Qty</th>
                    <th className="text-right px-6 py-3">Unit</th>
                    <th className="text-right px-6 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiry.items.map((item, idx) => (
                    <tr
                      key={`${item.variant_id}-${idx}`}
                      className={`border-b border-slate-800/50 ${
                        idx === enquiry.items.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-3">
                        <p className="text-slate-200">{item.product_name}</p>
                        <p className="text-slate-500 text-[11px]">
                          {item.variant_label}
                        </p>
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-400">
                        {item.sku}
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
                  <tr className="border-t border-slate-800">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-right text-xs text-slate-400"
                    >
                      Estimated Total
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-white">
                      {formatPaise(enquiry.estimated_total_paise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Update Status
                </h3>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#C69A48]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Note (optional)"
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#C69A48] resize-none"
                  />
                  <button
                    onClick={handleStatusUpdate}
                    disabled={statusUpdating}
                    className="w-full px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] disabled:opacity-50 text-black font-semibold text-xs transition-colors"
                  >
                    {statusUpdating ? "Updating…" : "Update Status"}
                  </button>
                  {statusMsg && (
                    <p
                      className={`text-[11px] ${
                        statusMsg.includes("success")
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {statusMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Set Owner Quote
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quotedRupees}
                      onChange={(e) => setQuotedRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#C69A48]"
                    />
                  </div>
                  <textarea
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                    placeholder="Note (optional)"
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#C69A48] resize-none"
                  />
                  <button
                    onClick={handleQuoteUpdate}
                    disabled={quoteUpdating}
                    className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                  >
                    {quoteUpdating ? "Saving…" : "Save Quote"}
                  </button>
                  {quoteMsg && (
                    <p
                      className={`text-[11px] ${
                        quoteMsg.includes("success")
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {quoteMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status History */}
            {enquiry.status_history && enquiry.status_history.length > 0 && (
              <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Audit Trail
                </h3>
                <ol className="space-y-3">
                  {[...enquiry.status_history].reverse().map((h, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs">
                      <span
                        className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          h.status === "completed"
                            ? "bg-emerald-400"
                            : h.status === "cancelled"
                            ? "bg-slate-500"
                            : "bg-[#C69A48]"
                        }`}
                      />
                      <div>
                        <span
                          className={`capitalize font-semibold ${
                            STATUS_STYLES[h.status]
                              ? STATUS_STYLES[h.status]
                                  .split(" ")
                                  .find((c) => c.startsWith("text-"))
                              : "text-slate-300"
                          }`}
                        >
                          {h.status.replace("_", " ")}
                        </span>{" "}
                        <span className="text-slate-500">
                          — {formatDateTime(h.changed_at)}
                        </span>
                        {h.note && (
                          <p className="text-slate-400 italic mt-0.5">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminEnquiryDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060e1a] flex items-center justify-center text-slate-400 text-sm">
          Loading enquiry…
        </div>
      }
    >
      <AdminEnquiryDetailContent />
    </Suspense>
  );
}
