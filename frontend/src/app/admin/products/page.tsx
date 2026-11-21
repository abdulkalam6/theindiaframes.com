"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";
import { Check, Plus, Save, ShieldAlert } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AdminVariant {
  id: string;
  sku: string;
  label: string;
  retail_price_paise: number;
  wholesale_price_paise?: number | null;
  wholesale_moq: number;
  availability: "available" | "unavailable";
}

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  base_sku: string;
  category_id: string;
  short_description?: string | null;
  variants: AdminVariant[];
}

function paiseToRupees(p?: number | null): string {
  if (p === undefined || p === null) return "";
  return (p / 100).toFixed(2);
}

function rupeesToPaise(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100);
}

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Add Product modal/panel
  const [showAddProd, setShowAddProd] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodSlug, setProdSlug] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodShortDesc, setProdShortDesc] = useState("");

  // Variant editing state keyed by variant id
  const [variantEdits, setVariantEdits] = useState<
    Record<
      string,
      {
        retail: string;
        wholesale: string;
        moq: number;
        availability: "available" | "unavailable";
      }
    >
  >({});
  const [savingVarId, setSavingVarId] = useState<string | null>(null);

  // Add Variant per product
  const [addingVarForProd, setAddingVarForProd] = useState<string | null>(null);
  const [newVarSku, setNewVarSku] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newVarRetail, setNewVarRetail] = useState("");
  const [newVarWholesale, setNewVarWholesale] = useState("");
  const [newVarMoq, setNewVarMoq] = useState("5");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, prodRes] = await Promise.all([
        apiClient<Category[]>("categories"),
        apiClient<AdminProduct[]>("admin/products?limit=200"),
      ]);
      if (catRes.data) {
        setCategories(catRes.data);
        if (!prodCatId && catRes.data[0]) setProdCatId(catRes.data[0].id);
      }
      if (prodRes.data) {
        setProducts(prodRes.data);
        const edits: typeof variantEdits = {};
        for (const p of prodRes.data) {
          for (const v of p.variants) {
            edits[v.id] = {
              retail: paiseToRupees(v.retail_price_paise),
              wholesale: paiseToRupees(v.wholesale_price_paise),
              moq: v.wholesale_moq,
              availability: v.availability,
            };
          }
        }
        setVariantEdits(edits);
      } else {
        setError(prodRes.error?.message ?? "Owner access required.");
      }
    } catch {
      setError("Failed to load catalogue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveVariant = async (variantId: string) => {
    const ed = variantEdits[variantId];
    if (!ed) return;
    setSavingVarId(variantId);
    setStatusBanner(null);
    try {
      const res = await apiClient(`admin/variants/${variantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          retail_price_paise: rupeesToPaise(ed.retail),
          wholesale_price_paise:
            ed.wholesale.trim() !== "" ? rupeesToPaise(ed.wholesale) : null,
          wholesale_moq: Math.max(1, ed.moq),
          availability: ed.availability,
        }),
      });
      if (res.error) {
        setError(res.error.message);
      } else {
        setStatusBanner("Variant pricing & availability updated.");
        await loadData();
      }
    } finally {
      setSavingVarId(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const slug =
      prodSlug.trim() ||
      prodName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const res = await apiClient("admin/products", {
      method: "POST",
      body: JSON.stringify({
        name: prodName.trim(),
        slug,
        base_sku: prodSku.trim().toUpperCase(),
        category_id: prodCatId,
        short_description: prodShortDesc.trim() || undefined,
      }),
    });
    if (res.error) {
      setError(res.error.message);
    } else {
      setShowAddProd(false);
      setProdName("");
      setProdSlug("");
      setProdSku("");
      setProdShortDesc("");
      setStatusBanner("Product created. Add at least one variant below.");
      await loadData();
    }
  };

  const handleAddVariant = async (prodId: string) => {
    setError(null);
    const res = await apiClient(`admin/products/${prodId}/variants`, {
      method: "POST",
      body: JSON.stringify({
        sku: newVarSku.trim().toUpperCase(),
        label: newVarLabel.trim(),
        retail_price_paise: rupeesToPaise(newVarRetail),
        wholesale_price_paise:
          newVarWholesale.trim() !== ""
            ? rupeesToPaise(newVarWholesale)
            : undefined,
        wholesale_moq: Math.max(1, parseInt(newVarMoq, 10) || 1),
        availability: "available",
      }),
    });
    if (res.error) {
      setError(res.error.message);
    } else {
      setAddingVarForProd(null);
      setNewVarSku("");
      setNewVarLabel("");
      setNewVarRetail("");
      setNewVarWholesale("");
      setNewVarMoq("5");
      setStatusBanner("Variant added to product.");
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <AdminNav title="Catalogue & Pricing Management" />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-400">
            Update retail prices, wholesale prices, MOQs, and stock availability
            live.
          </p>
          <button
            type="button"
            onClick={() => setShowAddProd((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            {showAddProd ? "Close Form" : "Add New Product"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </div>
        )}

        {statusBanner && (
          <div className="rounded-xl bg-emerald-950/60 border border-emerald-800 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            {statusBanner}
          </div>
        )}

        {showAddProd && (
          <form
            onSubmit={handleCreateProduct}
            className="rounded-xl bg-[#0b1726] border border-[#C69A48]/40 p-6 space-y-4 text-xs"
          >
            <h2 className="font-semibold text-[#E3C27B] uppercase tracking-widest">
              New Catalogue Product
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">
                  Product Name *
                </label>
                <input
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Royal Walnut Photo Frame"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Category *</label>
                <select
                  required
                  value={prodCatId}
                  onChange={(e) => setProdCatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Base SKU *</label>
                <input
                  required
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  placeholder="TIF-FRM-003"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  URL Slug (optional)
                </label>
                <input
                  value={prodSlug}
                  onChange={(e) => setProdSlug(e.target.value)}
                  placeholder="auto-generated-from-name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Short Description
              </label>
              <input
                value={prodShortDesc}
                onChange={(e) => setProdShortDesc(e.target.value)}
                placeholder="Brief summary shown on product cards"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold"
            >
              Create Product
            </button>
          </form>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading catalogue…
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-sm font-serif font-bold text-white">
                      {prod.name}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Base SKU: {prod.base_sku} · /{prod.slug}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAddingVarForProd(
                        addingVarForProd === prod.id ? null : prod.id
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-[#E3C27B]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variant
                  </button>
                </div>

                {addingVarForProd === prod.id && (
                  <div className="p-4 bg-[#071421] border-b border-slate-800 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs items-end">
                    <input
                      value={newVarSku}
                      onChange={(e) => setNewVarSku(e.target.value)}
                      placeholder="SKU"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono"
                    />
                    <input
                      value={newVarLabel}
                      onChange={(e) => setNewVarLabel(e.target.value)}
                      placeholder="Label (e.g. 10x12 in)"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newVarRetail}
                      onChange={(e) => setNewVarRetail(e.target.value)}
                      placeholder="Retail ₹"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newVarWholesale}
                      onChange={(e) => setNewVarWholesale(e.target.value)}
                      placeholder="Wholesale ₹"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newVarMoq}
                      onChange={(e) => setNewVarMoq(e.target.value)}
                      placeholder="MOQ"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddVariant(prod.id)}
                      className="py-1.5 rounded bg-[#C69A48] text-black font-semibold"
                    >
                      Save Variant
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="text-left px-5 py-2.5">SKU / Label</th>
                        <th className="text-left px-3 py-2.5">Retail (₹)</th>
                        <th className="text-left px-3 py-2.5">Wholesale (₹)</th>
                        <th className="text-left px-3 py-2.5">MOQ</th>
                        <th className="text-left px-3 py-2.5">Availability</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prod.variants.map((v) => {
                        const ed = variantEdits[v.id];
                        if (!ed) return null;
                        return (
                          <tr
                            key={v.id}
                            className="border-b border-slate-800/50 last:border-b-0"
                          >
                            <td className="px-5 py-2.5">
                              <p className="text-slate-200 font-medium">
                                {v.label}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {v.sku}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                step="0.01"
                                value={ed.retail}
                                onChange={(e) =>
                                  setVariantEdits((prev) => ({
                                    ...prev,
                                    [v.id]: { ...ed, retail: e.target.value },
                                  }))
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                step="0.01"
                                value={ed.wholesale}
                                onChange={(e) =>
                                  setVariantEdits((prev) => ({
                                    ...prev,
                                    [v.id]: {
                                      ...ed,
                                      wholesale: e.target.value,
                                    },
                                  }))
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-violet-300 font-mono"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min={1}
                                value={ed.moq}
                                onChange={(e) =>
                                  setVariantEdits((prev) => ({
                                    ...prev,
                                    [v.id]: {
                                      ...ed,
                                      moq: Math.max(
                                        1,
                                        parseInt(e.target.value, 10) || 1
                                      ),
                                    },
                                  }))
                                }
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <select
                                value={ed.availability}
                                onChange={(e) =>
                                  setVariantEdits((prev) => ({
                                    ...prev,
                                    [v.id]: {
                                      ...ed,
                                      availability: e.target.value as
                                        | "available"
                                        | "unavailable",
                                    },
                                  }))
                                }
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                              >
                                <option value="available">Available</option>
                                <option value="unavailable">Unavailable</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                disabled={savingVarId === v.id}
                                onClick={() => handleSaveVariant(v.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-[#C69A48] hover:text-black text-slate-200 font-semibold transition-colors disabled:opacity-50"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {savingVarId === v.id ? "Saving…" : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
