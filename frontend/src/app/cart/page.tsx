"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartLineKey, useCartStore } from "@/stores/cart";
import { apiClient } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";

interface ValidatedLine {
  product_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  variant_label: string;
  image_url?: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
  wholesale_moq: number;
  availability: string;
  moq_satisfied: boolean;
  is_valid: boolean;
}

interface ServerCartValidation {
  pricing_tier: "retail" | "wholesale";
  currency: string;
  items: ValidatedLine[];
  subtotal_paise: number;
  total_quantity: number;
  can_submit: boolean;
  validation_issues: string[];
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [serverValidation, setServerValidation] = useState<ServerCartValidation | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recalculate authoritative server prices whenever cart items change
  useEffect(() => {
    if (!mounted || items.length === 0) {
      setServerValidation(null);
      return;
    }

    async function revalidateCart() {
      setValidating(true);
      try {
        const payload = {
          items: items.map((i) => ({
            product_id: i.productId,
            variant_id: i.variantId,
            quantity: i.quantity,
          })),
        };

        const res = await apiClient<ServerCartValidation>("cart/validate", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (res.data) {
          setServerValidation(res.data);
        }
      } catch {
        // Fallback to local representation if offline
      } finally {
        setValidating(false);
      }
    }

    revalidateCart();
  }, [items, mounted]);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0b1726] border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B] mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white mb-2">
          Your Enquiry Cart is Empty
        </h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          Browse our catalogue of photo frames, framing hardware, and lamination machinery to begin building your enquiry.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black text-xs font-semibold"
        >
          Explore Catalogue
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="pb-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Continue Browsing
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Your Enquiry Cart
          </h1>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      {/* Validation Warnings */}
      {serverValidation && serverValidation.validation_issues.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Please review the following requirements before submitting:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            {serverValidation.validation_issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Pricing Tier Indicator */}
      {serverValidation && (
        <div className="mt-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#0b1726] border border-slate-800 text-xs">
          <span className="text-slate-400">Calculated Pricing Tier:</span>
          <span className="font-semibold capitalize text-[#E3C27B]">
            {serverValidation.pricing_tier} Prices Applied
          </span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, idx) => {
            const lineKey = getCartLineKey(item);
            const validated =
              serverValidation?.items[idx] ??
              serverValidation?.items.find(
                (v) => v.variant_id === item.variantId
              );
            const unitPrice = validated
              ? validated.unit_price_paise
              : item.retailPricePaise;
            const lineTotal = validated
              ? validated.line_total_paise
              : item.retailPricePaise * item.quantity;

            return (
              <div
                key={lineKey}
                className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {item.customPhoto?.previewDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.customPhoto.previewDataUrl}
                      alt={`Custom framed preview for ${item.productName}`}
                      className="w-20 h-24 object-contain rounded-lg bg-[#060e1a] border border-[#C69A48]/40 shrink-0"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">
                      {item.productName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Variant:{" "}
                      <span className="text-slate-200">{item.variantLabel}</span>{" "}
                      ({item.sku})
                    </p>

                    {item.customPhoto && (
                      <div className="pt-1 space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#C69A48]/20 border border-[#C69A48]/40 text-[#E3C27B] text-[10px] font-semibold">
                          Custom Photo Attached
                        </span>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.customPhoto.originalFilename} ·{" "}
                          {item.customPhoto.editSummary}
                        </p>
                      </div>
                    )}

                    {/* MOQ Notice */}
                    {serverValidation?.pricing_tier === "wholesale" && (
                      <div className="text-[11px] text-[#E3C27B] mt-1">
                        Wholesale MOQ: {item.wholesaleMoq} units
                        {item.quantity < item.wholesaleMoq && (
                          <span className="text-red-400 ml-2 font-semibold">
                            (Need {item.wholesaleMoq - item.quantity} more)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-300 pt-2 font-mono">
                      Unit: {formatINR(unitPrice)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-[#071421]">
                    <button
                      onClick={() => updateQuantity(lineKey, item.quantity - 1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-semibold text-white min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(lineKey, item.quantity + 1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#E3C27B] font-mono">
                      {formatINR(lineTotal)}
                    </span>
                  </div>

                  <button
                    onClick={() => removeItem(lineKey)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary & Submit CTAs */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-2xl bg-[#080B10] border border-slate-800 space-y-5 sticky top-24">
            <h2 className="text-base font-serif font-bold text-white pb-3 border-b border-slate-800">
              Enquiry Summary
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Items:</span>
                <span className="text-slate-200 font-semibold">
                  {serverValidation ? serverValidation.total_quantity : items.reduce((a, b) => a + b.quantity, 0)} units
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Subtotal:</span>
                <span className="text-lg font-bold text-[#E3C27B] font-mono">
                  {formatINR(serverValidation?.subtotal_paise || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-2">
                * Prices are validated server-side. No payment is taken now.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <Link
                href="/checkout"
                className={`w-full py-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  serverValidation?.can_submit
                    ? "bg-[#C69A48] hover:bg-[#b58a3a] text-black shadow-lg"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none"
                }`}
              >
                Proceed to Submit Enquiry
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="pt-2 text-xs text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C69A48] shrink-0 mt-0.5" />
              <span>
                Saving your enquiry triggers a pre-filled WhatsApp handoff for direct owner confirmation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
