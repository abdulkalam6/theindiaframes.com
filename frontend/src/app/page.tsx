import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { BusinessHighlights } from "@/components/home/BusinessHighlights";
import { CompleteCatalogueSection } from "@/components/home/CompleteCatalogueSection";
import { FeaturedProductsSection } from "@/components/home/FeaturedProductsSection";
import { ShopByOccasionSection } from "@/components/home/ShopByOccasionSection";
import { WholesaleSolutionsSection } from "@/components/home/WholesaleSolutionsSection";
import { EquipmentShowcaseSection } from "@/components/home/EquipmentShowcaseSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { InspirationGallerySection } from "@/components/home/InspirationGallerySection";
import { HowOrderingWorksSection } from "@/components/home/HowOrderingWorksSection";
import { FaqSection } from "@/components/home/FaqSection";
import { LocationContactSection } from "@/components/home/LocationContactSection";

export const metadata: Metadata = {
  title: "The India Frames | Where Memories Become Art",
  description:
    "Photo frames, framing accessories, lamination machines, consumables, custom framing and personalised gifts in Cumbum, Tamil Nadu. Retail & verified wholesale enquiries.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The India Frames | Where Memories Become Art",
    description:
      "Retail & wholesale photo frames, framing materials, lamination machines, consumables and custom framing in Cumbum, Tamil Nadu.",
    type: "website",
    locale: "en_IN",
  },
};

export default function HomePage() {
  return (
    <main className="flex flex-col w-full">
      <HeroSection />
      <BusinessHighlights />
      <CompleteCatalogueSection />
      <FeaturedProductsSection />
      <ShopByOccasionSection />
      <WholesaleSolutionsSection />
      <EquipmentShowcaseSection />
      <ServicesSection />
      <WhyChooseSection />
      <InspirationGallerySection />
      <HowOrderingWorksSection />
      <FaqSection />
      <LocationContactSection />
    </main>
  );
}
