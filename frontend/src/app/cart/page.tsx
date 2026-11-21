import Link from "next/link";
import { ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="pb-6 border-b border-slate-800">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Continue Browsing
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Your Enquiry Cart
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review your chosen items. At submission, your enquiry is saved in the database before generating a pre-filled WhatsApp message.
        </p>
      </div>

      {/* Empty State Shell */}
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#0b1726] border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B] mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-serif font-semibold text-white">
          Your cart is currently empty
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Select photo frames, machinery or framing consumables to begin building your enquiry.
        </p>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black text-xs font-semibold transition-all"
          >
            Explore Catalogue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Informational Callout */}
      <div className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 text-xs text-slate-400 flex items-start gap-3 mt-8">
        <ShieldCheck className="w-5 h-5 text-[#C69A48] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            How The India Frames Enquiry Works:
          </p>
          <p className="leading-relaxed">
            1. Add items &rarr; 2. Sign in or Register &rarr; 3. Submit enquiry (stored securely) &rarr; 4. Direct WhatsApp handoff for personalised quoting &amp; delivery confirmation. No online card payments required.
          </p>
        </div>
      </div>
    </div>
  );
}
