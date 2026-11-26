"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { apiClient } from "@/lib/api";

interface PublicSettings {
  whatsapp_number: string;
}

export function ServicesFinalCtaSection() {
  const [whatsappNumber, setWhatsappNumber] = useState("919443312345");

  useEffect(() => {
    let mounted = true;
    apiClient<PublicSettings>("settings/public").then((res) => {
      if (mounted && res.data?.whatsapp_number) {
        setWhatsappNumber(res.data.whatsapp_number);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    "Hello The India Frames, I would like to discuss a framing, lamination, or supply requirement."
  )}`;

  return (
    <section className="border-t border-[#C69A48]/20 bg-[#071421] py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.24em] text-[#C69A48] uppercase">
          THE INDIA FRAMES
        </p>
        <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          Let&apos;s Create Something Worth Remembering.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Speak with our team about custom framing, printing, lamination, glass works, or studio
          supplies.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C69A48] px-6 py-3.5 text-sm font-semibold text-[#071421] transition hover:bg-[#E3C27B]"
          >
            <Phone className="h-4 w-4" />
            Contact Us
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0b1726] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#C69A48] hover:text-[#E3C27B]"
          >
            Explore Products
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#C69A48]/45 bg-[#0b1726] px-6 py-3.5 text-sm font-semibold text-[#E3C27B] transition hover:border-[#C69A48] hover:bg-[#C69A48]/10"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Enquiry
          </a>
        </div>
      </div>
    </section>
  );
}
