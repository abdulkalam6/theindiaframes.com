import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-14 md:py-22 bg-gradient-to-b from-[#071421] via-[#091829] to-[#071421] border-b border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Editorial Copy & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C69A48]/15 border border-[#C69A48]/30 text-xs font-semibold text-[#E3C27B]">
              <Sparkles className="w-3.5 h-3.5 text-[#C69A48]" />
              Retail &amp; Business Wholesale • Cumbum, Tamil Nadu
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-serif font-bold text-white tracking-tight leading-[1.1]">
              Where Memories{" "}
              <span className="text-[#E3C27B] italic block sm:inline">
                Become Art.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Crafted photo frames, personalised gifts, and custom framing
              services for families — alongside bulk framing mouldings,
              lamination machines, and consumables for studios, print centres,
              and trade resellers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
              <Link
                href="/products"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-sm transition-all shadow-lg shadow-[#C69A48]/20 flex items-center justify-center gap-2"
              >
                Explore Products
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/wholesale"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#080B10]/80 hover:bg-slate-800 border border-[#C69A48]/50 text-[#E3C27B] font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#C69A48]" />
                Explore Wholesale
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>• Retail &amp; Custom Framing</span>
              <span>• GSTIN-Verified Wholesale</span>
              <span>• Direct WhatsApp Enquiry</span>
            </div>
          </div>

          {/* Photographic Frame Composition */}
          <div className="lg:col-span-6 animate-fade-up-delay">
            <div className="relative rounded-2xl overflow-hidden border border-[#C69A48]/35 bg-[#080B10] shadow-2xl shadow-black/50">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/images/home/hero-frames.jpg"
                  alt="Assorted handcrafted teak-gold, matte black, and wooden photo frames arranged on a deep navy studio wall"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071421]/80 via-transparent to-transparent" />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-[#0b1726]/95 border-t border-[#C69A48]/20">
                <div>
                  <p className="text-xs font-semibold text-[#E3C27B]">
                    Custom Photo Frame Studio
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Upload your photo, crop, add text &amp; preview mat borders
                    online.
                  </p>
                </div>
                <Link
                  href="/products?category=photo-frames"
                  className="shrink-0 px-3.5 py-2 rounded-lg bg-[#C69A48]/15 hover:bg-[#C69A48]/25 border border-[#C69A48]/40 text-xs font-semibold text-[#E3C27B] transition-colors"
                >
                  Frame a Photo →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Scroll Indicator */}
        <div className="mt-10 flex justify-center">
          <a
            href="#highlights"
            aria-label="Scroll to business highlights"
            className="inline-flex flex-col items-center gap-1 text-[11px] text-slate-400 hover:text-[#E3C27B] transition-colors"
          >
            <span>Discover our offerings</span>
            <ArrowDown className="w-4 h-4 text-[#C69A48]" />
          </a>
        </div>
      </div>

      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-[#C69A48]/5 blur-3xl pointer-events-none rounded-full" />
    </section>
  );
}
