import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, Image as ImageIcon } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Catalogue &amp; Supplies
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse retail catalogue items. Sign in with an approved wholesale account to access wholesale prices and MOQs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-[#C69A48]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C69A48]" />
            Filters &amp; Sort
          </button>
        </div>
      </div>

      {/* Placeholder State for Phase 1 */}
      <div className="py-16 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B] mb-4">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-serif font-semibold text-white">
          Catalogue Shell Ready
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Product and variant listing connected to live MongoDB collections will be activated in Phase 2. No mock or fake product data is shown as real per project rules.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
          >
            Return to Storefront
          </Link>
          <Link
            href="/cart"
            className="px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-xs font-semibold text-black"
          >
            View Cart Shell
          </Link>
        </div>
      </div>
    </div>
  );
}
