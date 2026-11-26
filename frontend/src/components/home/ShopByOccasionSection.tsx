import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart } from "lucide-react";

const OCCASIONS = [
  {
    title: "Wedding Memories",
    description:
      "Grand portrait frames and velvet-laminated keepsakes for wedding photography.",
    href: "/products?category=photo-frames",
    image: "/images/home/occasion-memories.jpg",
  },
  {
    title: "Birthday Gifts",
    description:
      "Personalised framed photos and custom captions crafted for milestone birthdays.",
    href: "/personalised-gifts",
    image: "/qa-products/teak-gold-frame.svg",
  },
  {
    title: "Anniversary Gifts",
    description:
      "Elegant gold-trimmed and collage frames celebrating years together.",
    href: "/personalised-gifts",
    image: "/images/home/hero-frames.jpg",
  },
  {
    title: "Family Memories",
    description:
      "Multi-size wall gallery sets and warm wooden mouldings for living spaces.",
    href: "/products?category=photo-frames",
    image: "/images/home/occasion-memories.jpg",
  },
  {
    title: "Couple Frames",
    description:
      "Custom-cropped portrait and dual-photo frames with protective mat borders.",
    href: "/personalised-gifts",
    image: "/qa-products/matte-black-frame.svg",
  },
  {
    title: "Devotional Frames",
    description:
      "Classic teak-gold and traditional profiles suited for sacred artwork and prints.",
    href: "/products?category=photo-frames",
    image: "/qa-products/teak-gold-frame.svg",
  },
  {
    title: "Certificates & Achievements",
    description:
      "Clean A4 and standard gallery frames with anti-glare glass and lamination.",
    href: "/services",
    image: "/qa-products/matte-black-frame.svg",
  },
];

export function ShopByOccasionSection() {
  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800 gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#C69A48]" /> Personalised
              &amp; Customised Gifts
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Shop by Occasion
            </h2>
          </div>
          <Link
            href="/personalised-gifts"
            className="text-xs font-semibold text-[#E3C27B] hover:text-white flex items-center gap-1 group"
          >
            Explore gift framing{" "}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {OCCASIONS.map((occ, idx) => (
            <Link
              key={occ.title}
              href={occ.href}
              className={`group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-[#C69A48]/60 bg-[#0b1726] transition-all ${
                idx === 0 ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div
                className={`relative w-full overflow-hidden ${
                  idx === 0 ? "aspect-[16/9] sm:aspect-[2/1]" : "aspect-[4/3]"
                }`}
              >
                <Image
                  src={occ.image}
                  alt={occ.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071421] via-[#071421]/55 to-transparent" />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 space-y-1.5">
                <h3 className="text-base sm:text-lg font-serif font-bold text-white group-hover:text-[#E3C27B] transition-colors">
                  {occ.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {occ.description}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E3C27B] pt-1">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
