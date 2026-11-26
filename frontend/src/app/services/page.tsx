import type { Metadata } from "next";
import { ServicesHero } from "@/components/services/ServicesHero";
import { ServiceOverviewSection } from "@/components/services/ServiceOverviewSection";
import { DigitalPrintingSection } from "@/components/services/DigitalPrintingSection";
import { PersonalisedGiftsShowcase } from "@/components/services/PersonalisedGiftsShowcase";
import { ServiceProcessSection } from "@/components/services/ServiceProcessSection";
import { CustomerSegmentsSection } from "@/components/services/CustomerSegmentsSection";
import { BulkEnquirySection } from "@/components/services/BulkEnquirySection";
import { ServicesFaqSection } from "@/components/services/ServicesFaqSection";
import { ServicesFinalCtaSection } from "@/components/services/ServicesFinalCtaSection";

export const metadata: Metadata = {
  title: "Framing, Lamination, Printing & Glass Services",
  description:
    "Custom photo and art framing, commercial lamination and mounting, digital photo and poster printing, precision glass works, and lamination machinery & consumables supply.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Framing, Lamination, Printing & Glass Services | The India Frames",
    description:
      "Solutions for individuals, photography studios, printing centres, and framing professionals.",
    url: "/services",
    type: "website",
  },
};

export default function ServicesPage() {
  const servicesJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Custom Photo Framing, Commercial Lamination, Digital Printing & Glass Works",
    provider: {
      "@type": "LocalBusiness",
      name: "The India Frames",
    },
    areaServed: "IN",
  };

  return (
    <main className="min-h-screen bg-[#080B10] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }}
      />
      <ServicesHero />
      <ServiceOverviewSection />
      <DigitalPrintingSection />
      <PersonalisedGiftsShowcase />
      <ServiceProcessSection />
      <CustomerSegmentsSection />
      <BulkEnquirySection />
      <ServicesFaqSection />
      <ServicesFinalCtaSection />
    </main>
  );
}
