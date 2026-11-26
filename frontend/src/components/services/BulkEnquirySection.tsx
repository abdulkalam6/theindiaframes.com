import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

export function BulkEnquirySection() {
  return (
    <section id="bulk-enquiry" className="border-y border-slate-800/80 bg-[#071421] py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#C69A48]/35 bg-gradient-to-br from-[#0b1726] to-[#080B10] p-8 text-center sm:p-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
            CUSTOM &amp; COMMERCIAL ENQUIRIES
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            Have a Custom Requirement or Bulk Order?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Browse our catalogue or submit an enquiry for custom framing, lamination services,
            machinery, or bulk framing supplies.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-[#C69A48] px-6 py-3.5 text-sm font-semibold text-[#071421] transition hover:bg-[#E3C27B]"
            >
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-lg border border-[#C69A48]/45 bg-[#071421] px-6 py-3.5 text-sm font-semibold text-[#E3C27B] transition hover:border-[#C69A48] hover:bg-[#C69A48]/10"
            >
              <ClipboardCheck className="h-4 w-4" />
              Submit an Enquiry
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
