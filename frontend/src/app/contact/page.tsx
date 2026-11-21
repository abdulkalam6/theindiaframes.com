import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, MessageCircle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About & Contact",
  description:
    "About The India Frames — retail and wholesale photo framing, lamination machines, and framing consumables in Cumbum, Tamil Nadu.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-10">
      <div className="pb-6 border-b border-slate-800 space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>
        <h1 className="text-3xl font-serif font-bold text-white">
          About The India Frames
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Where Memories Become Art — serving retail customers, photo studios,
          and framing workshops across Cumbum and Theni District, Tamil Nadu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 space-y-3">
          <MapPin className="w-6 h-6 text-[#C69A48]" />
          <h2 className="text-base font-serif font-bold text-white">
            Store Location
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cumbum, Theni District, Tamil Nadu, India.
          </p>
          <p className="text-[11px] text-slate-500">
            Exact street address, map pin, phone number, and store hours will
            appear here once finalized in Owner Business Settings.
          </p>
        </div>

        <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 space-y-3">
          <MessageCircle className="w-6 h-6 text-[#C69A48]" />
          <h2 className="text-base font-serif font-bold text-white">
            Enquiries &amp; WhatsApp Order Flow
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Add items to your enquiry cart and submit directly from our website.
            Your enquiry is saved with a reference ID and opens a pre-filled
            WhatsApp message so the owner can confirm stock and final pricing.
          </p>
          <Link
            href="/products"
            className="inline-block text-xs text-[#E3C27B] hover:underline pt-1"
          >
            Browse Catalogue →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0b1726] border border-[#C69A48]/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C69A48]" /> Trade &amp;
            Wholesale Enquiries
          </h2>
          <p className="text-xs text-slate-400">
            Photo studios and framing businesses with a valid GSTIN can apply
            online for owner-approved wholesale pricing.
          </p>
        </div>
        <Link
          href="/wholesale"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs shrink-0"
        >
          <ShieldCheck className="w-4 h-4" /> Apply for Wholesale
        </Link>
      </div>
    </div>
  );
}
