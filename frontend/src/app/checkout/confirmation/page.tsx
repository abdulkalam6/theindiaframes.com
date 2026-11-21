"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageCircle, ArrowRight, Home } from "lucide-react";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const enquiryId = searchParams.get("enquiryId") || "TIF-ENQUIRY";
  const rawWaUrl = searchParams.get("wa");
  const waUrl = rawWaUrl ? decodeURIComponent(rawWaUrl) : "https://wa.me/919443312345";

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-600/50 mx-auto flex items-center justify-center text-emerald-400 mb-6 shadow-xl">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
        Enquiry Saved Successfully!
      </h1>
      <p className="text-xs sm:text-sm text-slate-300 mb-6">
        Your enquiry reference number is:
      </p>

      <div className="inline-block px-5 py-2.5 rounded-xl bg-[#0b1726] border border-[#C69A48]/50 text-lg font-mono font-bold text-[#E3C27B] tracking-wider mb-8">
        {enquiryId}
      </div>

      <div className="p-6 rounded-2xl bg-[#080B10] border border-slate-800 text-left text-xs space-y-4 mb-8">
        <h2 className="font-semibold text-white uppercase tracking-wider text-[11px] text-[#E3C27B]">
          Next Step: Send Enquiry to Owner on WhatsApp
        </h2>
        <p className="text-slate-300 leading-relaxed">
          Your enquiry is stored in our database. Click below to open WhatsApp with your pre-filled enquiry summary. Tapping Send in WhatsApp connects you directly with our shop owner in Cumbum for final pricing and fulfillment.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          Send to WhatsApp
        </a>

        <Link
          href="/"
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
        >
          <Home className="w-4 h-4" />
          Return to Storefront
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
