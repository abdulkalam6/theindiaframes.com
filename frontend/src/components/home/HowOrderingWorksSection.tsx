import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ORDER_STEPS = [
  {
    num: "01",
    title: "Explore the Catalogue",
    desc: "Browse photo frames, framing materials, lamination machines, and consumables.",
  },
  {
    num: "02",
    title: "Choose Products & Variants",
    desc: "Select exact sizes, finishes, or upload and edit your own photo on frame products.",
  },
  {
    num: "03",
    title: "Add Multiple Products to Cart",
    desc: "Combine frames, accessories, and machinery into a single multi-item enquiry cart.",
  },
  {
    num: "04",
    title: "Create an Account or Sign In",
    desc: "Register or log in so your enquiry and pricing tier are securely linked to you.",
  },
  {
    num: "05",
    title: "Submit the Enquiry",
    desc: "Your enquiry is saved first with a unique reference ID — no online payment is required.",
  },
  {
    num: "06",
    title: "Continue via WhatsApp",
    desc: "Open the pre-filled WhatsApp message to confirm availability and pricing directly with the owner.",
  },
];

export function HowOrderingWorksSection() {
  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest">
            Simple Enquiry Workflow
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            How Ordering Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Enquire about one item or several products together in one cart — no
            online card or gateway payment required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ORDER_STEPS.map((st) => (
            <div
              key={st.num}
              className="p-5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-2"
            >
              <span className="inline-block text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#C69A48]/15 text-[#E3C27B] border border-[#C69A48]/30">
                Step {st.num}
              </span>
              <h3 className="text-sm font-semibold text-white">{st.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C69A48]/15 hover:bg-[#C69A48]/25 border border-[#C69A48]/40 text-xs font-semibold text-[#E3C27B] transition-colors"
          >
            Open Enquiry Cart <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
