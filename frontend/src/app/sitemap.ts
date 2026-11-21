import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://theindiaframes.com";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface SitemapProduct {
  slug: string;
  updated_at?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/personalised-gifts`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/wholesale`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/products?limit=100`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: SitemapProduct[] };
      for (const p of json.data ?? []) {
        entries.push({
          url: `${base}/products/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Graceful fallback during offline static builds
  }

  return entries;
}
