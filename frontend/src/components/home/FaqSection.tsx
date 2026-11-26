"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "Do you offer wholesale purchases?",
    a: "Yes. We supply photo frames, framing materials, lamination machines, and consumables to approved wholesale businesses such as photo studios, framing shops, printing centres, and gift shops.",
  },
  {
    q: "How can I apply for a wholesale account?",
    a: "Create an account on the website, visit the Wholesale Registration page, and submit your business details along with your mandatory 15-character GSTIN and a business proof document. Once reviewed and approved by the owner, wholesale pricing and MOQs appear automatically.",
  },
  {
    q: "Can I purchase multiple products together?",
    a: "Yes. You can add multiple products and variants across different categories into your enquiry cart and submit them together as a single enquiry.",
  },
  {
    q: "Do you provide customised photo frames?",
    a: "Yes. We offer custom framing for photographs, portraits, certificates, artwork, and wedding memories. On supported frame products, you can also upload and edit your photo online before adding the frame to your cart.",
  },
  {
    q: "Do you supply lamination machines?",
    a: "Yes. We list pouch lamination machines, roll lamination machines, hot and cold lamination equipment, and compatible lamination films and pouches in our catalogue.",
  },
  {
    q: "Can I enquire about bulk orders?",
    a: "Yes. Add the required items and quantities to your enquiry cart, include any bulk requirements in the customer note, submit the enquiry, and continue the conversation directly with the owner on WhatsApp.",
  },
  {
    q: "How can I check product availability?",
    a: "Each product variant shows its current availability status in the catalogue. After you submit an enquiry cart, the owner reviews live availability and confirms with you directly via WhatsApp.",
  },
  {
    q: "Do you provide digital printing and lamination services?",
    a: "Yes. Our workshop offers digital photo and poster printing, photo and document lamination, certificate lamination, glass works, and custom mirror solutions.",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-16 bg-[#080B10] border-y border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#C69A48]" /> Common
            Questions
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#C69A48] shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
