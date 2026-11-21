import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://theindiaframes.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/wholesale"],
        disallow: [
          "/admin",
          "/admin/",
          "/billing",
          "/billing/",
          "/account",
          "/checkout",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
