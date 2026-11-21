"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

interface PublicBusinessSettings {
  business_name: string;
  tagline: string;
  whatsapp_number: string;
  phone_display?: string | null;
  email?: string | null;
  address_line: string;
  map_url?: string | null;
  opening_hours?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
}

export default function ContactPage() {
  const [info, setInfo] = useState<PublicBusinessSettings>({
    business_name: "The India Frames",
    tagline: "Where Memories Become Art",
    whatsapp_number: "919443312345",
    address_line: "Cumbum, Theni District, Tamil Nadu, India",
  });

  useEffect(() => {
    apiClient<PublicBusinessSettings>("settings/public")
      .then((res) => {
        if (res.data) setInfo(res.data);
      })
      .catch(() => {
        // Fallback to default factual Cumbum info
      });
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-10">
      <div className="pb-6 border-b border-slate-800 space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>
        <h1 className="text-3xl font-serif font-bold text-white">
          About {info.business_name}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {info.tagline} — serving retail customers, photo studios, and framing
          workshops across Cumbum and Theni District, Tamil Nadu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 space-y-3 text-xs">
          <MapPin className="w-6 h-6 text-[#C69A48]" />
          <h2 className="text-base font-serif font-bold text-white">
            Store Location &amp; Contact
          </h2>
          <p className="text-slate-300 leading-relaxed">{info.address_line}</p>

          {info.phone_display && (
            <p className="text-slate-200 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#C69A48]" />{" "}
              {info.phone_display}
            </p>
          )}
          {info.email && (
            <p className="text-slate-200 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#C69A48]" /> {info.email}
            </p>
          )}
          {info.opening_hours && (
            <p className="text-slate-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#C69A48]" />{" "}
              {info.opening_hours}
            </p>
          )}

          {info.map_url && (
            <a
              href={info.map_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#E3C27B] hover:underline pt-1"
            >
              Open in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="rounded-2xl bg-[#0b1726] border border-slate-800 p-6 space-y-3 text-xs">
          <MessageCircle className="w-6 h-6 text-[#C69A48]" />
          <h2 className="text-base font-serif font-bold text-white">
            Enquiries &amp; WhatsApp Order Flow
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Add items (including custom edited framed photos) to your enquiry
            cart and submit directly from our website. Your enquiry is saved
            with a reference ID and opens a pre-filled WhatsApp message so the
            owner can confirm stock and final pricing.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/products"
              className="text-[#E3C27B] hover:underline font-medium"
            >
              Browse Catalogue →
            </Link>
            <a
              href={`https://wa.me/${info.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-medium"
            >
              Chat on WhatsApp →
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0b1726] border border-[#C69A48]/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C69A48]" /> Trade &amp;
            Wholesale Enquiries
          </h2>
          <p className="text-xs text-slate-400">
            Photo studios and framing businesses with a valid GSTIN can apply
            online for owner-approved wholesale pricing.
          </p>
        </div>
        <Link
          href="/wholesale"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs shrink-0"
        >
          <ShieldCheck className="w-4 h-4" /> Apply for Wholesale
        </Link>
      </div>
    </div>
  );
}
