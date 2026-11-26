"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

interface PublicSettings {
  whatsapp_number: string;
}

export function ServicesHero() {
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
    "Hello The India Frames, I would like to enquire about your framing, lamination, and glass services."
  )}`;

  return (
    <section className="relative overflow-hidden border-b border-[#C69A48]/20 bg-gradient-to-b from-[#071421] via-[#080B10] to-[#080B10] py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(198,154,72,0.12),transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="animate-fade-up lg:col-span-7">
            <p className="text-xs font-semibold tracking-[0.26em] text-[#C69A48] uppercase">
              OUR SERVICES
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Framing, Lamination &amp; Glass Services
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              From personalised photo framing and professional lamination to precision glass works
              and commercial framing supplies, The India Frames provides solutions for individuals,
              studios and businesses.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#service-overview"
                className="inline-flex items-center gap-2 rounded-lg bg-[#C69A48] px-6 py-3.5 text-sm font-semibold text-[#071421] transition hover:bg-[#E3C27B]"
              >
                Explore Our Services
                <ArrowDownRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#C69A48]/40 bg-[#0b1726]/80 px-6 py-3.5 text-sm font-semibold text-[#E3C27B] transition hover:border-[#C69A48] hover:bg-[#C69A48]/10"
              >
                <MessageCircle className="h-4 w-4" />
                Enquire on WhatsApp
              </a>
            </div>
          </div>

          <div className="animate-fade-up-delay lg:col-span-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#C69A48]/25 bg-[#0b1726]">
                <Image
                  src="/images/home/custom-framing-workshop.jpg"
                  alt="Custom photo and artwork framing craft"
                  fill
                  sizes="(max-width: 1024px) 45vw, 22vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="grid grid-rows-2 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b1726]">
                  <Image
                    src="/images/home/equipment-laminator.jpg"
                    alt="Commercial lamination machine and consumables"
                    fill
                    sizes="(max-width: 1024px) 45vw, 22vw"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b1726]">
                  <Image
                    src="/images/home/hero-frames.jpg"
                    alt="Collection of finished decorative and wooden photo frames"
                    fill
                    sizes="(max-width: 1024px) 45vw, 22vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
