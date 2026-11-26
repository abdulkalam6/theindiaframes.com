import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    title: "Custom Photo Framing",
    description:
      "Tailored framing for family portraits, wedding photography, canvas stretching, and fine art prints.",
    image: "/images/home/custom-framing-workshop.jpg",
    href: "/services",
  },
  {
    title: "Digital Photo & Poster Printing",
    description:
      "Studio-grade photographic and poster printing prepared for framing, gifting, and display.",
    image: "/images/home/occasion-memories.jpg",
    href: "/services",
  },
  {
    title: "Photo & Document Lamination",
    description:
      "Hot thermal and cold roll lamination protecting portraits, albums, and important records.",
    image: "/images/home/equipment-laminator.jpg",
    href: "/services",
  },
  {
    title: "Certificate Lamination",
    description:
      "Crisp, bubble-free lamination and neat gallery framing for academic and professional certificates.",
    image: "/qa-products/matte-black-frame.svg",
    href: "/services",
  },
  {
    title: "Glass Works",
    description:
      "Precision cutting of clear float glass and non-glare etched glass sheets for custom frame sizes.",
    image: "/qa-products/antiglare-glass.svg",
    href: "/services",
  },
  {
    title: "Custom Mirror Solutions",
    description:
      "Made-to-measure decorative and framed mirror assemblies suited for homes and commercial spaces.",
    image: "/images/home/hero-frames.jpg",
    href: "/services",
  },
  {
    title: "Personalised Gifts",
    description:
      "Custom-cropped framed photos, captions, and collage layouts for birthdays, weddings, and anniversaries.",
    image: "/qa-products/teak-gold-frame.svg",
    href: "/personalised-gifts",
  },
];

export function ServicesSection() {
  return (
    <section className="py-16 bg-[#080B10] border-y border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800 gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest">
              Specialist Workshop
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Our Services
            </h2>
          </div>
          <Link
            href="/services"
            className="text-xs font-semibold text-[#E3C27B] hover:text-white flex items-center gap-1 group"
          >
            All workshop services{" "}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((svc, idx) => (
            <div
              key={svc.title}
              className={`rounded-2xl bg-[#0b1726] border border-slate-800 hover:border-[#C69A48]/45 transition-all overflow-hidden flex flex-col justify-between ${
                idx === 0 ? "sm:col-span-2" : ""
              }`}
            >
              <div>
                <div
                  className={`relative w-full bg-[#081524] border-b border-slate-800/80 ${
                    idx === 0 ? "aspect-[16/9] sm:aspect-[2/1]" : "aspect-[4/3]"
                  }`}
                >
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5 space-y-1.5">
                  <h3 className="text-base font-serif font-bold text-white">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {svc.description}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5">
                <Link
                  href={svc.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E3C27B] hover:text-white transition-colors"
                >
                  Enquire About Service <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
