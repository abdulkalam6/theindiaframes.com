import { CheckCircle2 } from "lucide-react";

const ADVANTAGES = [
  {
    title: "Wide Range of Framing & Lamination Products",
    description:
      "Browse ready-made frames, MDF and designer profiles, backing boards, glass, lamination machines, and film rolls in one place.",
  },
  {
    title: "Retail & Wholesale Purchasing",
    description:
      "Transparent retail pricing for individual buyers alongside dedicated, verification-gated wholesale pricing for commercial accounts.",
  },
  {
    title: "Customised Framing Solutions",
    description:
      "Custom sizing, mat borders, glass cutting, and online photo editing tailored to each photograph, certificate, or artwork.",
  },
  {
    title: "Products for Professional Businesses",
    description:
      "Built to support photo studios, framing workshops, digital print centres, gift shops, and trade resellers.",
  },
  {
    title: "Bulk Order Enquiries",
    description:
      "Combine multiple frames, accessories, and consumables into a single multi-line enquiry cart for fast owner review.",
  },
  {
    title: "Customer-Focused Assistance",
    description:
      "Direct WhatsApp follow-up with the store owner to confirm availability, custom specifications, and final quotation.",
  },
];

export function WhyChooseSection() {
  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4 space-y-3">
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest">
              Why Choose Us
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-snug">
              Why Choose The India Frames?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Serving households and commercial framing businesses from Cumbum,
              Tamil Nadu with dependable supplies and personal owner assistance.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADVANTAGES.map((adv) => (
              <div
                key={adv.title}
                className="p-5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-2"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A48] shrink-0 mt-0.5" />
                  <h3 className="text-sm font-semibold text-white">
                    {adv.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">
                  {adv.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
