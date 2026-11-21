"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cart";
import { apiClient } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  account_type: string;
  wholesale_status: string;
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await apiClient<UserProfile>("auth/me");
        if (res.data) {
          setUser(res.data);
        } else {
          window.location.href = "/login?redirect=/checkout";
        }
      } catch {
        window.location.href = "/login?redirect=/checkout";
      } finally {
        setLoadingUser(false);
      }
    }
    loadAuth();
  }, []);

  const handleSubmitEnquiry = async () => {
    if (!user || items.length === 0) return;

    setSubmitting(true);
    setErrorMsg("");

    const idempotencyKey = `idemp-${user.id}-${Date.now()}`;
    const payload = {
      items: items.map((it) => ({
        product_id: it.productId,
        variant_id: it.variantId,
        quantity: it.quantity,
      })),
      customer_note: customerNote || undefined,
      idempotency_key: idempotencyKey,
    };

    try {
      const res = await apiClient<{ id: string; enquiry_id: string; whatsapp_url: string }>(
        "enquiries",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (res.error) {
        setErrorMsg(res.error.message || "Could not submit enquiry.");
      } else if (res.data) {
        // Clear local cart now that enquiry is immutably stored in MongoDB
        clearCart();
        // Redirect to confirmation page with enquiry details and WhatsApp handoff
        window.location.href = `/checkout/confirmation?id=${res.data.id}&enquiryId=${res.data.enquiry_id}&wa=${encodeURIComponent(
          res.data.whatsapp_url
        )}`;
      }
    } catch {
      setErrorMsg("Connection failure while saving your enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Verifying customer authentication...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <p className="text-xs text-slate-400 mb-4">Your cart has no items to submit.</p>
        <Link
          href="/products"
          className="px-4 py-2 rounded-lg bg-[#C69A48] text-black text-xs font-semibold"
        >
          Explore Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="pb-6 border-b border-slate-800">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Review &amp; Submit Order Enquiry
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review your details and cart lines before submitting. After saving, you will open WhatsApp to confirm your order with the owner.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* Customer Snapshot */}
        <div className="p-5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-semibold text-[#E3C27B] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#C69A48]" /> Authenticated Customer
            </span>
            <span className="capitalize text-slate-400">
              Account: <strong className="text-white">{user?.account_type}</strong>
            </span>
          </div>
          <p className="text-slate-200">{user?.name} &bull; {user?.email}</p>
          {user?.phone && <p className="text-slate-400">Phone: {user.phone}</p>}
        </div>

        {/* Line Items Snapshot */}
        <div className="p-5 rounded-xl bg-[#080B10] border border-slate-800 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E3C27B]">
            Enquiry Items ({items.length})
          </h2>
          <div className="divide-y divide-slate-800 text-xs">
            {items.map((it) => (
              <div key={it.variantId} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{it.productName}</p>
                  <p className="text-slate-400 text-[11px]">
                    {it.variantLabel} ({it.sku}) &times; {it.quantity}
                  </p>
                </div>
                <div className="text-right font-mono text-slate-200">
                  {formatINR(it.retailPricePaise * it.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Note */}
        <div>
          <label className="block text-xs text-slate-300 font-medium mb-1">
            Optional Notes or Delivery Instructions
          </label>
          <textarea
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="e.g. Please confirm delivery timeline to Theni / Madurai..."
            className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 text-xs focus:border-[#C69A48] focus:outline-none"
          />
        </div>

        {/* Notice of Zero Online Cards */}
        <div className="p-4 rounded-xl bg-[#0b1726] border border-[#C69A48]/30 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C69A48]" /> Zero Payment Gateway Required
          </p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            No card or UPI transaction happens online. Submitting securely logs your enquiry in our database and generates a pre-filled WhatsApp handoff for direct owner confirmation.
          </p>
        </div>

        {/* Submit Action */}
        <button
          onClick={handleSubmitEnquiry}
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs sm:text-sm transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          {submitting ? "Saving Enquiry..." : "Confirm & Save Enquiry"}
        </button>
      </div>
    </div>
  );
}
