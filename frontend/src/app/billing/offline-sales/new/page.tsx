"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  LogOut,
  Plus,
  ShieldAlert,
  Store,
  Trash2,
  User,
} from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface CatalogueVariant {
  id: string;
  sku: string;
  label: string;
  retail_price_paise?: number | null;
}

interface CatalogueProduct {
  id: string;
  name: string;
  base_sku: string;
  variants: CatalogueVariant[];
}

interface DraftLineItem {
  key: string;
  mode: "catalogue" | "custom";
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  sku: string;
  quantity: number;
  unit_price_rupees: string;
  catalogue_price_paise: number | null;
}

interface CreatedSaleResponse {
  source_id: string;
  reference_id: string;
}

function rupeesToPaise(val: string): number {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function NewOfflineSalePage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [customerMode, setCustomerMode] = useState<"walkin" | "existing">(
    "walkin"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [walkinName, setWalkinName] = useState("Walk-in customer");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinEmail, setWalkinEmail] = useState("");

  const [lines, setLines] = useState<DraftLineItem[]>([
    {
      key: "line-1",
      mode: "custom",
      product_id: "",
      variant_id: "",
      product_name: "",
      variant_label: "",
      sku: "",
      quantity: 1,
      unit_price_rupees: "",
      catalogue_price_paise: null,
    },
  ]);

  const [discountRupees, setDiscountRupees] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [custRes, prodRes] = await Promise.all([
          apiClient<CustomerOption[]>("admin/customers?limit=100"),
          apiClient<CatalogueProduct[]>("products?limit=100"),
        ]);
        if (custRes.data) setCustomers(custRes.data);
        if (prodRes.data) setProducts(prodRes.data);
      } catch {
        // Non-blocking: owner can still enter walk-in and custom items
      } finally {
        setLoadingInit(false);
      }
    }
    loadOptions();
  }, []);

  const addLine = (mode: "catalogue" | "custom") => {
    setLines((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${prev.length + 1}`,
        mode,
        product_id: "",
        variant_id: "",
        product_name: "",
        variant_label: "",
        sku: "",
        quantity: 1,
        unit_price_rupees: "",
        catalogue_price_paise: null,
      },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.key !== key) : prev
    );
  };

  const updateLine = (key: string, patch: Partial<DraftLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  };

  const handleSelectVariant = (key: string, prodId: string, varId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const variant = prod?.variants.find((v) => v.id === varId);
    if (!prod || !variant) return;
    const catPrice = variant.retail_price_paise ?? null;
    updateLine(key, {
      product_id: prod.id,
      variant_id: variant.id,
      product_name: prod.name,
      variant_label: variant.label,
      sku: variant.sku,
      catalogue_price_paise: catPrice,
      unit_price_rupees: catPrice !== null ? (catPrice / 100).toFixed(2) : "",
    });
  };

  const subtotalPaise = lines.reduce(
    (sum, l) => sum + Math.max(1, l.quantity) * rupeesToPaise(l.unit_price_rupees),
    0
  );
  const discountPaise = rupeesToPaise(discountRupees);
  const payablePaise = Math.max(0, subtotalPaise - discountPaise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (customerMode === "existing" && !selectedCustomerId) {
      setErrorMsg("Please select an existing customer or switch to Walk-in.");
      return;
    }

    if (discountPaise > subtotalPaise) {
      setErrorMsg("Discount cannot exceed the subtotal.");
      return;
    }

    const itemsPayload = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const unitPaise = rupeesToPaise(l.unit_price_rupees);
      if (l.mode === "catalogue" && !l.variant_id) {
        setErrorMsg(`Line #${i + 1}: select a catalogue product variant.`);
        return;
      }
      if (l.mode === "custom" && !l.product_name.trim()) {
        setErrorMsg(`Line #${i + 1}: enter a product/item description.`);
        return;
      }
      if (l.unit_price_rupees.trim() === "" || unitPaise < 0) {
        setErrorMsg(`Line #${i + 1}: enter a valid unit price.`);
        return;
      }
      itemsPayload.push({
        product_id: l.product_id || undefined,
        variant_id: l.variant_id || undefined,
        product_name: l.product_name.trim() || undefined,
        variant_label: l.variant_label.trim() || undefined,
        sku: l.sku.trim() || undefined,
        quantity: Math.max(1, l.quantity),
        unit_price_paise: unitPaise,
      });
    }

    const customerPayload =
      customerMode === "existing"
        ? { customer_id: selectedCustomerId }
        : {
            name: walkinName.trim() || "Walk-in customer",
            phone: walkinPhone.trim() || undefined,
            email: walkinEmail.trim() || undefined,
          };

    setSubmitting(true);
    try {
      const res = await apiClient<CreatedSaleResponse>("billing/offline-sales", {
        method: "POST",
        body: JSON.stringify({
          customer: customerPayload,
          items: itemsPayload,
          discount_paise: discountPaise,
          notes: notes.trim() || undefined,
        }),
      });
      const detailErr = (res as { detail?: string }).detail;
      if (res.data) {
        router.push(`/billing/records/offline_sale/${res.data.source_id}`);
      } else {
        setErrorMsg(
          res.error?.message || detailErr || "Failed to create offline sale."
        );
      }
    } catch {
      setErrorMsg("Network error while creating offline sale.");
    } finally {
      setSubmitting(false);
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
            Record Offline Counter Sale
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

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Unified Billing
        </Link>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-950/70 border border-red-800 p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Capture */}
          <section className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-[#C69A48]" />
                Customer Details
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomerMode("walkin")}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    customerMode === "walkin"
                      ? "bg-[#C69A48] text-black font-semibold"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Walk-in Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    customerMode === "existing"
                      ? "bg-[#C69A48] text-black font-semibold"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Existing Account ({customers.length})
                </button>
              </div>
            </div>

            {customerMode === "existing" ? (
              <div className="text-xs">
                <label className="block text-slate-400 mb-1">
                  Select Registered Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-[#C69A48]"
                >
                  <option value="">
                    {loadingInit
                      ? "Loading customers…"
                      : "— Choose a customer —"}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Walk-in customer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#C69A48]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+91…"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#C69A48]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={walkinEmail}
                    onChange={(e) => setWalkinEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#C69A48]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Store className="w-4 h-4 text-[#C69A48]" />
                Sale Line Items
              </h2>
              <div className="flex items-center gap-2">
                {products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => addLine("catalogue")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#E3C27B]" /> Catalogue
                    Item
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => addLine("custom")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E3C27B]" /> Custom Item
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => {
                const enteredPaise = rupeesToPaise(line.unit_price_rupees);
                const hasPriceOverride =
                  line.catalogue_price_paise !== null &&
                  line.unit_price_rupees.trim() !== "" &&
                  enteredPaise !== line.catalogue_price_paise;

                const selectedProd = products.find(
                  (p) => p.id === line.product_id
                );

                return (
                  <div
                    key={line.key}
                    className="p-4 rounded-lg bg-[#071421] border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">
                        Item #{index + 1}{" "}
                        <span className="text-slate-600 font-normal">
                          ({line.mode})
                        </span>
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    {line.mode === "catalogue" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 mb-1">
                            Product
                          </label>
                          <select
                            value={line.product_id}
                            onChange={(e) =>
                              updateLine(line.key, {
                                product_id: e.target.value,
                                variant_id: "",
                                catalogue_price_paise: null,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                          >
                            <option value="">— Select Product —</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.base_sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1">
                            Variant
                          </label>
                          <select
                            value={line.variant_id}
                            disabled={!selectedProd}
                            onChange={(e) =>
                              handleSelectVariant(
                                line.key,
                                line.product_id,
                                e.target.value
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 disabled:opacity-50"
                          >
                            <option value="">— Select Variant —</option>
                            {selectedProd?.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label} — {v.sku}
                                {v.retail_price_paise !== undefined &&
                                v.retail_price_paise !== null
                                  ? ` (${formatPaise(v.retail_price_paise)})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 mb-1">
                            Item / Product Name
                          </label>
                          <input
                            type="text"
                            required
                            value={line.product_name}
                            onChange={(e) =>
                              updateLine(line.key, {
                                product_name: e.target.value,
                              })
                            }
                            placeholder="e.g. Custom Wooden Frame"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1">
                            Size / Variant Label (optional)
                          </label>
                          <input
                            type="text"
                            value={line.variant_label}
                            onChange={(e) =>
                              updateLine(line.key, {
                                variant_label: e.target.value,
                              })
                            }
                            placeholder="e.g. 12 x 18 inches"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-slate-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, {
                              quantity: Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1
                              ),
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">
                          Unit Price (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={line.unit_price_rupees}
                          onChange={(e) =>
                            updateLine(line.key, {
                              unit_price_rupees: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                        />
                      </div>
                      <div className="text-right pb-2">
                        <span className="text-slate-500 block text-[11px]">
                          Line Total
                        </span>
                        <span className="text-white font-semibold">
                          {formatPaise(Math.max(1, line.quantity) * enteredPaise)}
                        </span>
                      </div>
                    </div>

                    {hasPriceOverride && line.catalogue_price_paise !== null && (
                      <p className="text-[11px] text-amber-400">
                        Manual price override (catalogue retail:{" "}
                        {formatPaise(line.catalogue_price_paise)}) — will be
                        recorded in the audit log.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Totals, Discount & Notes */}
          <section className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Counter Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agreed counter terms or pickup note"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-1.5 text-right">
              <p className="text-slate-400">
                Subtotal:{" "}
                <span className="text-slate-200 font-medium">
                  {formatPaise(subtotalPaise)}
                </span>
              </p>
              {discountPaise > 0 && (
                <p className="text-slate-400">
                  Discount:{" "}
                  <span className="text-emerald-400">
                    -{formatPaise(discountPaise)}
                  </span>
                </p>
              )}
              <p className="text-base font-bold text-white pt-1">
                Payable Total: {formatPaise(payablePaise)}
              </p>
              <p className="text-[11px] text-slate-500">
                Tax calculation is disabled in v1; payable total reflects direct
                agreed item totals minus discount.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] disabled:opacity-50 text-black font-semibold text-xs transition-colors"
              >
                {submitting
                  ? "Saving offline sale…"
                  : "Create Offline Sale & Proceed to Payment"}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
