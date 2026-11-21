import Link from "next/link";
import { Layers, ShieldCheck, Printer, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const categories = [
    {
      title: "Photo Frames",
      description: "Artistic, synthetic and wooden frames in standard and custom sizes.",
      href: "/products?category=photo-frames",
      tag: "Retail & Wholesale",
    },
    {
      title: "Glass & Backing",
      description: "Non-glare glass, clear glass, MDF backing boards, and frame hardware.",
      href: "/products?category=glass-and-backing",
      tag: "Workshop Supplies",
    },
    {
      title: "Lamination Machines",
      description: "Heavy-duty thermal and cold roll lamination machines for studios.",
      href: "/products?category=lamination-machines",
      tag: "Machinery",
    },
    {
      title: "Lamination Films & Rolls",
      description: "Glossy, matte, velvet and crystal cold films with reliable adhesion.",
      href: "/products?category=lamination-consumables",
      tag: "Consumables",
    },
    {
      title: "Custom Framing & Glass Works",
      description: "Precision cutting, bevelled glass, acrylic mounting and bespoke displays.",
      href: "/services",
      tag: "Services",
    },
    {
      title: "Personalised Gifts",
      description: "Custom photo prints, collage frames, illuminated frames and corporate mementos.",
      href: "/personalised-gifts",
      tag: "Custom Art",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-[#071421] via-[#091829] to-[#071421] border-b border-[#C69A48]/20">
        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C69A48]/15 border border-[#C69A48]/30 text-xs font-semibold text-[#E3C27B] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#C69A48]" />
            Official Storefront &amp; Wholesale Supplier • Cumbum, TN
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
            Where Memories <span className="text-[#E3C27B] italic">Become Art</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Distributors of high-grade photo frames, framing hardware, lamination machines, consumables and personalized art framing solutions.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/products"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-sm transition-all shadow-lg shadow-[#C69A48]/20 flex items-center justify-center gap-2"
            >
              Explore Products
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/wholesale"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#071421] hover:bg-slate-800 border border-[#C69A48]/50 text-[#E3C27B] font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#C69A48]" />
              Wholesale Registration
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C69A48]/5 blur-3xl pointer-events-none rounded-full" />
      </section>

      {/* Categories Grid */}
      <section className="py-16 bg-[#071421]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-wider">
                Product &amp; Service Families
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
                Explore Our Catalogue
              </h2>
            </div>
            <Link
              href="/products"
              className="mt-3 md:mt-0 text-xs font-semibold text-[#E3C27B] hover:text-white flex items-center gap-1 group"
            >
              View all items <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="group p-6 rounded-xl bg-[#0b1726] border border-slate-800 hover:border-[#C69A48]/50 hover:bg-[#0f1f33] transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#C69A48]/15 text-[#E3C27B] border border-[#C69A48]/30">
                    {cat.tag}
                  </span>
                  <h3 className="text-lg font-semibold text-white mt-3 group-hover:text-[#E3C27B] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center text-xs font-medium text-[#E3C27B] group-hover:translate-x-1 transition-transform">
                  Browse category <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Wholesale Banner Callout */}
      <section className="py-12 bg-[#080B10] border-y border-[#C69A48]/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="rounded-2xl bg-gradient-to-r from-[#0d1a29] to-[#071421] p-8 md:p-12 border border-[#C69A48]/30 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E3C27B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C69A48]" /> For Frame Studios &amp; Printing Businesses
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Apply for Wholesale &amp; Bulk Pricing
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Registered framing shops and printing centres can apply for owner-approved wholesale pricing with fixed MOQs. Mandatory GSTIN and business verification required.
              </p>
            </div>

            <Link
              href="/wholesale"
              className="shrink-0 px-6 py-3.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-sm transition-all shadow-md"
            >
              Wholesale Application
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Services Section */}
      <section className="py-16 bg-[#071421]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-wider">
              Specialist Workshop
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Custom Crafting &amp; Machinery Services
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#0b1726] border border-slate-800">
              <Layers className="w-8 h-8 text-[#C69A48] mb-4" />
              <h3 className="text-base font-semibold text-white">Custom Framing</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Expert framing for fine art, certificates, portraits and canvas stretching tailored to exact dimensions.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0b1726] border border-slate-800">
              <Printer className="w-8 h-8 text-[#C69A48] mb-4" />
              <h3 className="text-base font-semibold text-white">Lamination &amp; Printing</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                High-volume cold/thermal roll lamination, protective photographic coatings and wide-format mounting.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0b1726] border border-slate-800">
              <Sparkles className="w-8 h-8 text-[#C69A48] mb-4" />
              <h3 className="text-base font-semibold text-white">Glass Works &amp; Gifts</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Bevelled glass cutting, acrylic sheets, LED frames and personalised gifting assemblies.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
