import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Layers,
  Printer,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Workshop Services",
  description:
    "Custom photo framing, precision glass cutting, studio lamination, and framing machinery support in Cumbum, Tamil Nadu.",
  alternates: { canonical: "/services" },
};

const SERVICES = [
  {
    title: "Custom Photo & Art Framing",
    icon: Layers,
    summary:
      "Precision custom sizing for family portraits, wedding photography, certificates, fine art prints, and stretched canvases.",
    highlights: [
      "MDF, synthetic, and teak-finish profiles cut to exact dimensions",
      "Clear float glass, non-glare etched glass, and acrylic front options",
      "Moisture-resistant MDF backing with sturdy wall-mount hardware",
    ],
  },
  {
    title: "Commercial Lamination & Mounting",
    icon: Printer,
    summary:
      "Studio-grade thermal and cold roll lamination services for wedding albums, display prints, posters, and certificates.",
    highlights: [
      "Velvet matte, silky matte, high-gloss, and crystal film finishes",
      "Bubble-free hot and cold roll mounting on MDF & sunboard",
      "Consistent batch turnaround for local photo studios and print shops",
    ],
  },
  {
    title: "Precision Glass Works",
    icon: Sparkles,
    summary:
      "Custom glass cutting and protective glazing tailored for photo frames, shadow boxes, and decorative wall displays.",
    highlights: [
      "2mm clear and anti-glare framing glass cut to custom sizes",
      "Edge smoothing and safe studio packaging for bulk orders",
      "Replacement glazing for heirloom and damaged photo frames",
    ],
  },
  {
    title: "Machinery Guidance & Consumables Supply",
    icon: Wrench,
    summary:
      "Reliable supply of roll laminators, films, backing boards, and frame accessories for commercial framing workshops.",
    highlights: [
      "Thermal and cold lamination machines for small to high-volume studios",
      "Bulk wholesale pricing and MOQ tiers for GST-verified businesses",
      "Direct owner consultation via WhatsApp after enquiry submission",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-12">
      <div className="pb-6 border-b border-slate-800 space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
          Framing, Lamination &amp; Glass Services
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          From individual custom portraits to recurring studio workshop
          production in Cumbum, Theni District, Tamil Nadu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SERVICES.map((svc) => (
          <div
            key={svc.title}
            className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 sm:p-7 space-y-4 hover:border-[#C69A48]/40 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-[#C69A48]/15 border border-[#C69A48]/30 flex items-center justify-center text-[#E3C27B]">
              <svc.icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-serif font-bold text-white">
              {svc.title}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {svc.summary}
            </p>
            <ul className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              {svc.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C69A48] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d1a29] to-[#071421] border border-[#C69A48]/30 p-7 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E3C27B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C69A48]" /> Direct Owner
            Consultation
          </p>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
            Need a Custom Size or Bulk Workshop Quote?
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Add standard supplies to your enquiry cart with custom notes, or
            register for a verified wholesale account to unlock trade pricing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-colors"
          >
            Browse Supplies <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/wholesale"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
          >
            Wholesale Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
