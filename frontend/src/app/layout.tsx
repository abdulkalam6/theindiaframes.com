import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://theindiaframes.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The India Frames | Where Memories Become Art",
    template: "%s | The India Frames",
  },
  description:
    "Photo frames, framing materials, lamination machines and consumables. Retail catalogue and verified business wholesale supplier in Cumbum, Tamil Nadu.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "The India Frames",
    title: "The India Frames | Where Memories Become Art",
    description:
      "Photo frames, framing materials, lamination machines and consumables in Cumbum, Tamil Nadu.",
    images: [{ url: "/logo/ifc-logo.png", alt: "The India Frames" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The India Frames | Where Memories Become Art",
    description:
      "Photo frames, framing materials, lamination machines and consumables in Cumbum, Tamil Nadu.",
  },
  icons: {
    icon: "/logo/ifc-logo.png",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "The India Frames",
  url: SITE_URL,
  logo: `${SITE_URL}/logo/ifc-logo.png`,
  description:
    "Photo framing retail and wholesale supplies in Cumbum, Tamil Nadu.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cumbum",
    addressRegion: "Tamil Nadu",
    addressCountry: "IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="flex flex-col min-h-screen bg-[#071421] text-slate-100 antialiased"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <Header />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
