import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Gift, Heart, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Personalised Gifts",
  description:
    "Custom photo collage frames, wedding portraits, corporate mementos, and personalised framed gifts crafted in Cumbum, Tamil Nadu.",
  alternates: { canonical: "/personalised-gifts" },
};

const GIFT_IDEAS = [
  {
    title: "Wedding & Anniversary Collage Frames",
    description:
      "Multi-photo curated layouts paired with warm teak-gold or sleek gallery black mouldings and anti-glare glass.",
    tag: "Family & Celebrations",
  },
  {
    title: "Framed Portrait Prints & Lamination",
    description:
      "Velvet-matte laminated portraits designed to preserve colour and eliminate harsh room reflections for years.",
    tag: "Portraits",
  },
  {
    title: "Certificates, Awards & Corporate Mementos",
    description:
      "Clean, uniform framing sets for institutions, schools, clinics, and business recognition events.",
    tag: "Bulk & Institutional",
  },
];

export default function PersonalisedGiftsPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-10">
      <div className="pb-6 border-b border-slate-800 space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#C69A48] font-semibold uppercase tracking-widest pt-1">
          <Gift className="w-4 h-4" /> Custom Gift Framing
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
          Personalised Gifts &amp; Custom Displays
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Turn memorable photographs into lasting keepsakes. Select your frame
          style from our catalogue and include custom sizing or gifting notes
          when submitting your enquiry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GIFT_IDEAS.map((gift) => (
          <div
            key={gift.title}
            className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 space-y-3"
          >
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#C69A48]/15 text-[#E3C27B] border border-[#C69A48]/30">
              <Sparkles className="w-3 h-3" /> {gift.tag}
            </span>
            <h2 className="text-base font-serif font-bold text-white">
              {gift.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {gift.description}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-[#0b1726] border border-[#C69A48]/30 p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#C69A48]" /> Start Your Custom Gift
            Enquiry
          </h2>
          <p className="text-xs text-slate-400">
            Pick a base frame from our catalogue and mention your custom gift
            requirements in the checkout note before sending via WhatsApp.
          </p>
        </div>
        <Link
          href="/products?category=photo-frames"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs shrink-0 transition-colors"
        >
          Browse Photo Frames <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
