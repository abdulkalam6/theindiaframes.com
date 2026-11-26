"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import {
  ArrowRight,
  Check,
  Image as ImageIcon,
  ShoppingCart,
} from "lucide-react";

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
  is_featured: boolean;
  gallery?: Array<{ url: string; alt?: string }>;
  variants: Variant[];
}

export function FeaturedProductsSection() {
  const addItem = useCartStore((s) => s.addItem);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient<Product[]>("products?limit=8")
      .then((res) => {
        if (!active || !res.data) return;
        const featured = res.data.filter((p) => p.is_featured);
        setProducts(featured.length > 0 ? featured : res.data.slice(0, 6));
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAddToCart = (product: Product, variant: Variant) => {
    const isWholesaleOnly =
      variant.wholesale_price_paise !== undefined &&
      variant.wholesale_price_paise !== null &&
      (variant.retail_price_paise === undefined ||
        variant.retail_price_paise === null);
    const qty = isWholesaleOnly ? variant.wholesale_moq ?? 1 : 1;

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
    setAddedId(variant.id);
    setTimeout(() => setAddedId(null), 1600);
  };

  return (
    <section className="py-16 bg-[#080B10] border-y border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800 gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest">
              Live Storefront Selection
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Featured Products
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ready-made frames, MDF &amp; designer profiles, lamination
              machines, and consumables from our active catalogue.
            </p>
          </div>
          <Link
            href="/products"
            className="px-4 py-2 rounded-lg bg-[#C69A48]/15 hover:bg-[#C69A48]/25 border border-[#C69A48]/40 text-xs font-semibold text-[#E3C27B] flex items-center gap-1.5 shrink-0 transition-colors"
          >
            View All Products <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((skeleton) => (
              <div
                key={skeleton}
                className="h-80 rounded-2xl bg-[#0b1726] border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-10 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#C69A48]/15 border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-semibold text-white">
              Catalogue Products Coming Soon
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our product catalogue is currently being updated. You can still
              browse categories or contact us directly for custom framing and
              bulk enquiries.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/products"
                className="px-4 py-2 rounded-lg bg-[#C69A48] text-black font-semibold text-xs"
              >
                Open Catalogue
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs"
              >
                Contact Store
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const primaryVariant =
                product.variants.find((v) => v.availability === "available") ??
                product.variants[0];
              const cover =
                primaryVariant?.gallery?.[0] ?? product.gallery?.[0] ?? null;

              const availableCount = product.variants.filter(
                (v) => v.availability === "available"
              ).length;

              const isWholesaleView =
                primaryVariant &&
                primaryVariant.wholesale_price_paise !== undefined &&
                primaryVariant.wholesale_price_paise !== null &&
                (primaryVariant.retail_price_paise === undefined ||
                  primaryVariant.retail_price_paise === null);

              const activePrice = primaryVariant
                ? isWholesaleView
                  ? primaryVariant.wholesale_price_paise
                  : primaryVariant.retail_price_paise
                : null;

              const isAdded =
                primaryVariant && addedId === primaryVariant.id;

              return (
                <div
                  key={product.id}
                  className="rounded-2xl bg-[#0b1726] border border-slate-800 hover:border-[#C69A48]/50 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="block relative aspect-[4/3] w-full bg-[#081524] border-b border-slate-800/80 overflow-hidden"
                    >
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt || product.name}
                          fill
                          loading="lazy"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1.5">
                          <ImageIcon className="w-8 h-8 text-[#C69A48]/40" />
                          <span className="text-[11px]">Image pending</span>
                        </div>
                      )}
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm border ${
                          availableCount > 0
                            ? "bg-emerald-950/85 text-emerald-300 border-emerald-700"
                            : "bg-slate-900/90 text-slate-400 border-slate-700"
                        }`}
                      >
                        {availableCount > 0
                          ? `${availableCount} variant${
                              availableCount > 1 ? "s" : ""
                            } available`
                          : "Currently unavailable"}
                      </span>
                    </Link>

                    <div className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-base font-serif font-bold text-white hover:text-[#E3C27B] transition-colors"
                        >
                          {product.name}
                        </Link>
                      </div>

                      {product.short_description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {product.short_description}
                        </p>
                      )}

                      {primaryVariant && (
                        <div className="pt-2 flex items-baseline justify-between gap-2 text-xs">
                          <span className="text-slate-400 truncate">
                            {primaryVariant.label}
                          </span>
                          {activePrice !== undefined && activePrice !== null ? (
                            <span className="text-sm font-bold text-[#E3C27B] font-mono shrink-0">
                              {formatINR(activePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-500 shrink-0">
                              Price on enquiry
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex items-center gap-2.5">
                    {primaryVariant &&
                    primaryVariant.availability === "available" ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product, primaryVariant)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-[#C69A48] hover:bg-[#b58a3a] text-black"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="flex-1 py-2.5 px-3 rounded-lg bg-slate-800 text-slate-500 text-xs text-center">
                        Unavailable
                      </span>
                    )}

                    <Link
                      href={`/products/${product.slug}`}
                      className="py-2.5 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shrink-0"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
