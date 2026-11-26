import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck } from "lucide-react";

const TARGET_BUSINESSES = [
  "Photo Studios",
  "Framing Shops",
  "Printing Centres",
  "Gift Shops",
  "Retailers",
  "Resellers",
];

const WHOLESALE_SUPPLY = [
  "Wholesale photo frames",
  "Framing materials & mouldings",
  "Lamination machines",
  "Lamination consumables",
  "Bulk purchase enquiries",
];

const STEPS = [
  {
    step: "01",
    title: "Create a Wholesale Account",
    description:
      "Register on the website and select Wholesale Business as your account intent.",
  },
  {
    step: "02",
    title: "Submit Business Details & GSTIN",
    description:
      "Provide your commercial address, mandatory 15-character GSTIN, and business proof document.",
  },
  {
    step: "03",
    title: "Access Owner-Approved Pricing",
    description:
      "Once verified and approved by the owner, wholesale prices and MOQs unlock across your catalogue and cart.",
  },
];

export function WholesaleSolutionsSection() {
  return (
    <section className="py-16 bg-[#080B10] border-y border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="rounded-2xl bg-gradient-to-br from-[#0d1a29] via-[#0b1726] to-[#071421] border border-[#C69A48]/35 p-7 sm:p-10 lg:p-12 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E3C27B]">
                <ShieldCheck className="w-4 h-4 text-[#C69A48]" /> Wholesale
                &amp; Business Solutions
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Trade Supply for Framing &amp; Printing Businesses
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                We supply commercial workshops and retail partners with reliable
                frame inventory, raw framing materials, and lamination equipment.
                Wholesale pricing is strictly protected behind owner
                verification.
              </p>

              {/* Target Customers */}
              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C69A48]" /> Built for
                </p>
                <div className="flex flex-wrap gap-2">
                  {TARGET_BUSINESSES.map((biz) => (
                    <span
                      key={biz}
                      className="px-3 py-1 rounded-full bg-[#071421] border border-slate-700 text-xs text-slate-200"
                    >
                      {biz}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Supply Scope */}
            <div className="lg:col-span-5 rounded-xl bg-[#071421]/90 border border-slate-800 p-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#E3C27B]">
                What Businesses Can Source
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {WHOLESALE_SUPPLY.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C69A48] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-3">
                <Link
                  href="/wholesale"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-colors"
                >
                  Apply for Wholesale Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* 3-Step Approval Process */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-slate-800/80">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="p-5 rounded-xl bg-[#071421]/80 border border-slate-800 space-y-2"
              >
                <span className="text-xs font-mono font-bold text-[#C69A48]">
                  STEP {s.step}
                </span>
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
