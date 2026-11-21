import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductDetailClient } from "./ProductDetailClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://theindiaframes.com";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface PublicProductMeta {
  name: string;
  slug: string;
  short_description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  variants?: Array<{
    retail_price_paise?: number | null;
    availability?: string;
  }>;
}

async function fetchPublicProduct(
  slug: string
): Promise<PublicProductMeta | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL.replace(/\/$/, "")}/products/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(2000), cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PublicProductMeta };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);

  if (!product) {
    return {
      title: "Product Details",
      alternates: { canonical: `/products/${slug}` },
    };
  }

  const title = product.seo_title || product.name;
  const description =
    product.seo_description ||
    product.short_description ||
    `${product.name} available at The India Frames, Cumbum, Tamil Nadu.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL.replace(/\/$/, "")}/products/${product.slug}`,
    },
  };
}

async function ProductPageContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);

  const retailPrices = (product?.variants ?? [])
    .map((v) => v.retail_price_paise)
    .filter((p): p is number => typeof p === "number" && p > 0);

  const productJsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.short_description ?? undefined,
        url: `${SITE_URL.replace(/\/$/, "")}/products/${product.slug}`,
        ...(retailPrices.length > 0
          ? {
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "INR",
                lowPrice: (Math.min(...retailPrices) / 100).toFixed(2),
                highPrice: (Math.max(...retailPrices) / 100).toFixed(2),
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductDetailClient slug={slug} />
    </>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
          Loading product…
        </div>
      }
    >
      <ProductPageContent params={params} />
    </Suspense>
  );
}
