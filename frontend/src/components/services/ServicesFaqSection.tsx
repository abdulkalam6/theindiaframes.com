"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const SERVICE_FAQS = [
  {
    q: "Do you offer custom frame sizes?",
    a: "Yes. We provide custom frame sizing tailored to your photographs, certificates, artwork, and wall-display requirements. Share your measurements via an enquiry to discuss available frame profiles and options.",
  },
  {
    q: "Can I order personalised photo frames for gifts?",
    a: "Yes. You can create and customise personalised frames for birthdays, weddings, anniversaries, couple portraits, family memories, and special occasions through our Personalised Gifts section or by contacting our team.",
  },
  {
    q: "Do you provide lamination for documents and posters?",
    a: "Yes. We offer photo lamination, document lamination, certificate lamination, and poster lamination, including both hot and cold lamination services depending on your item.",
  },
  {
    q: "Do you supply lamination machines and consumables?",
    a: "Yes. We supply pouch lamination machines, roll lamination machines, hot and cold lamination machines, thermal pouches, lamination films and rolls, accessories, and compatible spare parts.",
  },
  {
    q: "Do you offer glass cutting for frames and mirrors?",
    a: "Yes. We provide photo frame glass, custom-sized glass cutting, protective glazing, glass replacement, and mirror solutions tailored to specific framing and decorative requirements.",
  },
  {
    q: "Do you support wholesale or studio requirements?",
    a: "Yes. Photography studios, printing centres, framing shops, and retailers can register for a wholesale account with valid business details and GSTIN, or submit bulk supply enquiries directly.",
  },
  {
    q: "How do I enquire about custom framing or printing?",
    a: "You can reach us through the Contact page, message us directly on WhatsApp, or add products to your cart and submit an enquiry with your custom dimensions and printing requirements.",
  },
  {
    q: "Do you handle bulk framing orders?",
    a: "Yes. We handle bulk framing, institutional certificate framing, and commercial supply requests. Submit your approximate quantities and specifications so our team can assist you.",
  },
  {
    q: "Can businesses buy framing materials and accessories from you?",
    a: "Yes. We supply framing materials and accessories including mouldings, MDF and backing boards, glass, hooks, hangers, and lamination consumables for framing shops and studios.",
  },
] as const;

export function ServicesFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="services-faq" className="bg-[#080B10] py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            Common Questions About Our Services
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {SERVICE_FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1726]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-800/30"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#C69A48] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800/80 px-5 pt-3 pb-4 text-sm leading-relaxed text-slate-300">
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
