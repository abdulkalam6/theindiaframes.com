import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const GALLERY_ITEMS = [
  {
    title: "Wall-Mounted Photo Arrangements",
    caption: "Studio visual: assorted teak-gold and matte black gallery frames",
    image: "/images/home/hero-frames.jpg",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    title: "Wedding & Family Frames",
    caption: "Studio visual: warm portrait and certificate display",
    image: "/images/home/occasion-memories.jpg",
    span: "",
  },
  {
    title: "Designer Framing & Craft",
    caption: "Studio visual: miter-cut mouldings, mat boards & bevelled glass",
    image: "/images/home/custom-framing-workshop.jpg",
    span: "",
  },
  {
    title: "Lamination & Print Finishing",
    caption: "Studio visual: commercial roll laminator and film rolls",
    image: "/images/home/equipment-laminator.jpg",
    span: "md:col-span-2",
  },
];

export function InspirationGallerySection() {
  return (
    <section className="py-16 bg-[#080B10] border-y border-[#C69A48]/20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800 gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C69A48]" /> Visual
              Showcase
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Framing Styles &amp; Studio Inspiration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Illustrative studio compositions showcasing frame styles, wall
              arrangements, personalised gifts, and lamination finishing.
            </p>
          </div>
          <Link
            href="/products?category=photo-frames"
            className="text-xs font-semibold text-[#E3C27B] hover:text-white flex items-center gap-1 group"
          >
            Customise your own frame{" "}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[210px]">
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.title}
              className={`group relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1726] ${item.span}`}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071421]/90 via-[#071421]/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-sm font-serif font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
