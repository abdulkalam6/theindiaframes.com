import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const CATALOGUE_CATEGORIES = [
  {
    title: "Photo Frames",
    description:
      "Ready-made, MDF, designer, devotional, and calendar frames in studio-standard sizes.",
    href: "/products?category=photo-frames",
    image: "/qa-products/teak-gold-frame.svg",
    alt: "Classic teak and gold-trim photo frame",
    badge: "Frames",
  },
  {
    title: "Frame Accessories & Materials",
    description:
      "Mouldings, MDF boards, backing boards, clear & non-glare glass, hooks, and hangers.",
    href: "/products?category=glass-and-backing",
    image: "/qa-products/antiglare-glass.svg",
    alt: "Anti-glare framing glass and backing materials",
    badge: "Materials",
  },
  {
    title: "Lamination Machines",
    description:
      "Pouch, hot and cold, roll, and commercial lamination machines for photo labs.",
    href: "/products?category=lamination-machines",
    image: "/qa-products/thermal-laminator.svg",
    alt: "Commercial thermal roll lamination machine",
    badge: "Equipment",
  },
  {
    title: "Lamination Accessories & Consumables",
    description:
      "Pouches, velvet and glossy films, rolls, sheets, and machine spare parts.",
    href: "/products?category=lamination-consumables",
    image: "/qa-products/velvet-roll-film.svg",
    alt: "Velvet matte lamination roll film",
    badge: "Consumables",
  },
  {
    title: "Custom Framing",
    description:
      "Bespoke framing for photographs, certificates, artwork, and wedding memories.",
    href: "/services",
    image: "/images/home/custom-framing-workshop.jpg",
    alt: "Custom photo framing corner mouldings and mat boards",
    badge: "Workshop",
  },
  {
    title: "Digital Printing & Lamination",
    description:
      "Photo printing, poster printing, and protective document lamination services.",
    href: "/services",
    image: "/images/home/equipment-laminator.jpg",
    alt: "Studio lamination and photo printing equipment",
    badge: "Services",
  },
  {
    title: "Glass Works",
    description:
      "Precision glass cutting and customised mirror solutions for frames and interiors.",
    href: "/services",
    image: "/qa-products/antiglare-glass.svg",
    alt: "Precision-cut framing glass sheets",
    badge: "Glass & Mirrors",
  },
  {
    title: "Personalised Gifts",
    description:
      "Thoughtful framed keepsakes for birthdays, weddings, anniversaries, and occasions.",
    href: "/personalised-gifts",
    image: "/images/home/occasion-memories.jpg",
    alt: "Personalised framed gifts and family portraits",
    badge: "Custom Gifts",
  },
];

export function CompleteCatalogueSection() {
  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 pb-4 border-b border-slate-800 gap-4">
          <div>
            <p className="text-xs uppercase font-semibold text-[#E3C27B] tracking-widest">
              Product &amp; Service Families
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Explore Our Complete Catalogue
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold text-[#E3C27B] hover:text-white flex items-center gap-1 group"
          >
            View all products{" "}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CATALOGUE_CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group rounded-2xl bg-[#0b1726] border border-slate-800 hover:border-[#C69A48]/55 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/3] w-full bg-[#081524] overflow-hidden border-b border-slate-800/80">
                <Image
                  src={cat.image}
                  alt={cat.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#071421]/85 text-[#E3C27B] border border-[#C69A48]/40 backdrop-blur-sm">
                  {cat.badge}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-white group-hover:text-[#E3C27B] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="flex items-center text-xs font-semibold text-[#E3C27B] group-hover:translate-x-1 transition-transform">
                  Explore Category <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
