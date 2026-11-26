"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

interface PublicSettings {
  business_name: string;
  tagline: string;
  whatsapp_number: string;
  phone_display?: string | null;
  email?: string | null;
  address_line: string;
  map_url?: string | null;
  opening_hours?: string | null;
}

export function LocationContactSection() {
  const [settings, setSettings] = useState<PublicSettings>({
    business_name: "The India Frames",
    tagline: "Where Memories Become Art",
    whatsapp_number: "919443312345",
    address_line: "Cumbum, Theni District, Tamil Nadu, India",
  });

  useEffect(() => {
    let active = true;
    apiClient<PublicSettings>("settings/public")
      .then((res) => {
        if (active && res.data) setSettings(res.data);
      })
      .catch(() => {
        // Fallback to factual Cumbum default
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="rounded-2xl bg-gradient-to-r from-[#0d1a29] via-[#0b1726] to-[#080B10] border border-[#C69A48]/40 p-7 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#E3C27B]">
              {settings.business_name} • Cumbum, Tamil Nadu
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Ready to Frame Your Memories or Source for Your Studio?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {settings.tagline}. Browse our online catalogue to build a
              multi-item enquiry, apply for a GSTIN-verified wholesale account,
              or reach out directly on WhatsApp.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C69A48] shrink-0 mt-0.5" />
                <span>{settings.address_line}</span>
              </p>
              {settings.phone_display && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#C69A48] shrink-0" />
                  <span>{settings.phone_display}</span>
                </p>
              )}
              {settings.opening_hours && (
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C69A48] shrink-0" />
                  <span>{settings.opening_hours}</span>
                </p>
              )}
              {settings.map_url && (
                <a
                  href={settings.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#E3C27B] hover:underline pt-1"
                >
                  View Location Map <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            <Link
              href="/products"
              className="w-full py-3.5 px-5 rounded-xl bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/wholesale"
              className="w-full py-3.5 px-5 rounded-xl bg-[#071421] hover:bg-slate-800 border border-[#C69A48]/50 text-[#E3C27B] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#C69A48]" />
              Wholesale Enquiry
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <Link
                href="/contact"
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                Contact Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
