"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useCartStore } from "@/stores/cart";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface Variant {
  id: string;
  sku: string;
  label: string;
  retail_price_paise?: number | null;
  wholesale_price_paise?: number | null;
  wholesale_moq?: number | null;
  availability: "available" | "unavailable";
  gallery?: Array<{ url: string; alt?: string }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  base_sku: string;
  short_description?: string | null;
  category_id: string;
  tags?: string[];
  gallery?: Array<{ url: string; alt?: string }>;
  is_featured: boolean;
  variants: Variant[];
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const categorySlugParam = searchParams.get("category");
  const addItem = useCartStore((s) => s.addItem);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!categorySlugParam || categories.length === 0) return;
    const match = categories.find((c) => c.slug === categorySlugParam);
    if (match) {
      setSelectedCategory(match.id);
    }
  }, [categorySlugParam, categories]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs =
          selectedCategory !== "all" ? `?category_id=${selectedCategory}` : "";
        const [catRes, prodRes] = await Promise.all([
          apiClient<Category[]>("categories"),
          apiClient<Product[]>(`products${qs}`),
        ]);
        if (catRes.data) setCategories(catRes.data);
        if (prodRes.data) {
          setProducts(prodRes.data);
        } else {
          setError(prodRes.error?.message ?? "Could not load catalogue.");
        }
      } catch {
        setError("Unable to reach the catalogue service right now.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCategory]);

  const filteredProducts = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.base_sku.toLowerCase().includes(q) ||
      (p.short_description?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleQuickAdd = (product: Product, variant: Variant) => {
    const isWholesaleTier =
      variant.wholesale_price_paise !== undefined &&
      variant.wholesale_price_paise !== null &&
      (variant.retail_price_paise === undefined ||
        variant.retail_price_paise === null);
    const qty = isWholesaleTier ? variant.wholesale_moq ?? 1 : 1;

    addItem(
      {
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        productName: product.name,
        variantLabel: variant.label,
        imageUrl: variant.gallery?.[0]?.url ?? product.gallery?.[0]?.url,
        retailPricePaise: variant.retail_price_paise ?? 0,
        wholesalePricePaise: variant.wholesale_price_paise ?? undefined,
        wholesaleMoq: variant.wholesale_moq ?? 1,
      },
      qty
    );
    setAddedVariantId(variant.id);
    setTimeout(() => setAddedVariantId(null), 1500);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Catalogue &amp; Supplies
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse photo frames, lamination machines, consumables, and glass.
            Approved wholesale accounts automatically see wholesale prices &amp;
            MOQs.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or SKU…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#0b1726] border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C69A48]"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap py-5">
        <SlidersHorizontal className="w-4 h-4 text-[#C69A48]" />
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            selectedCategory === "all"
              ? "bg-[#C69A48] text-black font-semibold"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
              selectedCategory === cat.id
                ? "bg-[#C69A48] text-black font-semibold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* States */}
      {error && (
        <div className="rounded-xl bg-red-950/60 border border-red-800 p-5 text-xs text-red-300 my-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Loading catalogue…
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B] mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-serif font-semibold text-white">
            No Matching Products
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Try clearing your search or selecting another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {filteredProducts.map((product) => {
            const firstAvail =
              product.variants.find((v) => v.availability === "available") ??
              product.variants[0];
            const wsOnly =
              firstAvail &&
              firstAvail.wholesale_price_paise !== undefined &&
              firstAvail.wholesale_price_paise !== null &&
              (firstAvail.retail_price_paise === undefined ||
                firstAvail.retail_price_paise === null);

            const coverImage =
              firstAvail?.gallery?.[0] ?? product.gallery?.[0] ?? null;

            return (
              <div
                key={product.id}
                className="rounded-2xl bg-[#0b1726] border border-slate-800 hover:border-[#C69A48]/50 transition-colors p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <Link
                    href={`/products/${product.slug}`}
                    className="block relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#081524] border border-slate-800/80"
                  >
                    {coverImage ? (
                      <Image
                        src={coverImage.url}
                        alt={coverImage.alt || product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1.5">
                        <ImageIcon className="w-7 h-7 text-[#C69A48]/50" />
                        <span className="text-[11px]">Image pending upload</span>
                      </div>
                    )}
                  </Link>

                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-base font-serif font-bold text-white hover:text-[#E3C27B] transition-colors"
                    >
                      {product.name}
                    </Link>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {product.base_sku}
                    </span>
                  </div>

                  {product.short_description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {product.short_description}
                    </p>
                  )}

                  {/* Variant Preview List */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    {product.variants.map((v) => {
                      const isAvailable = v.availability === "available";
                      const activePrice = wsOnly
                        ? v.wholesale_price_paise
                        : v.retail_price_paise ?? v.wholesale_price_paise;
                      const isAdded = addedVariantId === v.id;

                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-2 text-xs bg-[#071421] border border-slate-800/80 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-slate-200 font-medium truncate">
                              {v.label}
                            </p>
                            <div className="flex items-center gap-2 text-[11px]">
                              {activePrice !== undefined &&
                              activePrice !== null ? (
                                <span className="text-[#E3C27B] font-semibold">
                                  {formatPaise(activePrice)}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  Price on enquiry
                                </span>
                              )}
                              {v.wholesale_moq &&
                                v.wholesale_price_paise !== undefined && (
                                  <span className="text-violet-300">
                                    MOQ: {v.wholesale_moq}
                                  </span>
                                )}
                            </div>
                          </div>

                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(product, v)}
                              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                isAdded
                                  ? "bg-emerald-600 text-white"
                                  : "bg-[#C69A48] hover:bg-[#b58a3a] text-black"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3 h-3" /> Added
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-3 h-3" /> Add
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500 shrink-0">
                              Unavailable
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    href={`/products/${product.slug}`}
                    className="text-xs text-[#E3C27B] hover:text-white font-medium transition-colors"
                  >
                    View Details →
                  </Link>
                  {(product.base_sku.toUpperCase().includes("FRM") ||
                    product.name.toLowerCase().includes("frame")) && (
                    <Link
                      href={`/products/${product.slug}#photo-editor`}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[#C69A48]/15 hover:bg-[#C69A48]/25 border border-[#C69A48]/40 text-[#E3C27B] font-semibold transition-colors"
                    >
                      Upload &amp; Edit Photo
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
          Loading catalogue…
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
