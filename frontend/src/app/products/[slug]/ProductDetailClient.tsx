"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useCartStore, type CartCustomPhoto } from "@/stores/cart";
import { FramePhotoEditor } from "@/components/FramePhotoEditor";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  ImagePlus,
  ShoppingCart,
} from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  label: string;
  attributes?: Record<string, string>;
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
  description?: string | null;
  gallery?: Array<{ url: string; alt?: string }>;
  tags: string[];
  variants: Variant[];
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function ProductDetailClient({ slug }: { slug: string }) {
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient<Product>(`products/${slug}`);
        if (res.data) {
          setProduct(res.data);
          const isFrameProduct =
            res.data.base_sku.toUpperCase().includes("FRM") ||
            res.data.tags.some((t) => t.toLowerCase().includes("frame")) ||
            res.data.name.toLowerCase().includes("frame");
          setShowPhotoEditor(isFrameProduct);
          const first =
            res.data.variants.find((v) => v.availability === "available") ??
            res.data.variants[0];
          if (first) {
            setSelectedVariantId(first.id);
            const wsOnly =
              first.wholesale_price_paise !== undefined &&
              first.wholesale_price_paise !== null &&
              (first.retail_price_paise === undefined ||
                first.retail_price_paise === null);
            setQuantity(wsOnly ? first.wholesale_moq ?? 1 : 1);
          }
        } else {
          setError(res.error?.message ?? "Product not found.");
        }
      } catch {
        setError("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading product…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-red-400">{error ?? "Product not found."}</p>
        <Link
          href="/products"
          className="text-xs text-[#E3C27B] hover:underline"
        >
          Return to Catalogue
        </Link>
      </div>
    );
  }

  const variant =
    product.variants.find((v) => v.id === selectedVariantId) ??
    product.variants[0];

  const isWholesaleTier =
    variant &&
    variant.wholesale_price_paise !== undefined &&
    variant.wholesale_price_paise !== null &&
    (variant.retail_price_paise === undefined ||
      variant.retail_price_paise === null);

  const activePrice = variant
    ? isWholesaleTier
      ? variant.wholesale_price_paise
      : variant.retail_price_paise ?? variant.wholesale_price_paise
    : null;

  const handleAddToCart = () => {
    if (!variant || variant.availability !== "available") return;
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
      Math.max(1, quantity)
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleAddWithCustomPhoto = (customPhoto: CartCustomPhoto) => {
    if (!variant || variant.availability !== "available") return;
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
        customPhoto,
      },
      Math.max(1, quantity)
    );
  };

  const heroImage = variant?.gallery?.[0] ?? product.gallery?.[0] ?? null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
      </Link>

      <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#081524] border border-slate-800">
            {heroImage ? (
              <Image
                src={heroImage.url}
                alt={heroImage.alt || product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <ImageIcon className="w-10 h-10 text-[#C69A48]/50" />
                <span className="text-xs">Product image pending upload</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-mono text-slate-500">
              SKU: {variant?.sku ?? product.base_sku}
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Variant Picker */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Select Variant
          </h2>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedVariantId(v.id);
                  const ws =
                    v.wholesale_price_paise !== undefined &&
                    v.wholesale_price_paise !== null &&
                    (v.retail_price_paise === undefined ||
                      v.retail_price_paise === null);
                  setQuantity(ws ? v.wholesale_moq ?? 1 : 1);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs border transition-colors ${
                  v.id === variant?.id
                    ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                    : "bg-[#071421] border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {v.label}
                {v.availability === "unavailable" && (
                  <span className="ml-1.5 text-[10px] text-slate-500">
                    (Unavailable)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Add to Cart */}
        {variant && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                {activePrice !== undefined && activePrice !== null ? (
                  <span className="text-2xl font-bold text-white">
                    {formatPaise(activePrice)}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-slate-400">
                    Price on enquiry
                  </span>
                )}
                <span className="text-xs text-slate-400">per unit</span>
              </div>

              {variant.wholesale_price_paise !== undefined &&
                variant.wholesale_price_paise !== null && (
                  <p className="text-xs text-violet-300">
                    Wholesale tier active · Minimum Order Quantity (MOQ):{" "}
                    <strong>{variant.wholesale_moq ?? 1}</strong>
                  </p>
                )}
            </div>

            {variant.availability === "available" ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  aria-label="Quantity"
                  className="w-20 px-3 py-2.5 rounded-lg bg-[#071421] border border-slate-700 text-xs text-white text-center"
                />
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-[#C69A48] hover:bg-[#b58a3a] text-black"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" /> Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" /> Add to Enquiry Cart
                    </>
                  )}
                </button>
              </div>
            ) : (
              <span className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-400">
                Currently Unavailable
              </span>
            )}
          </div>
        )}

        {variant && !showPhotoEditor && (
          <div className="pt-2 border-t border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPhotoEditor(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Want to attach &amp; edit a
              custom photo? Open Photo Studio
            </button>
          </div>
        )}
      </div>

      {/* Interactive Custom Photo Upload & Frame Editor */}
      {variant && showPhotoEditor && (
        <FramePhotoEditor
          productName={product.name}
          variantLabel={variant.label}
          sku={variant.sku}
          quantity={Math.max(1, quantity)}
          disabled={variant.availability !== "available"}
          onPhotoAddedToCart={handleAddWithCustomPhoto}
        />
      )}
    </div>
  );
}
