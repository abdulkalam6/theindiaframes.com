import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Frame, Layers, Settings2, Sparkles } from "lucide-react";

const SERVICE_FAMILIES = [
  {
    id: "custom-framing",
    title: "Custom Photo & Art Framing",
    description:
      "Transform your photographs, artwork and special memories into beautifully presented framed pieces.",
    note: "Enquire with us for custom dimensions, frame styles, and personalised framing requirements.",
    image: "/images/home/custom-framing-workshop.jpg",
    imageAlt: "Custom photo and artwork framing workshop",
    icon: Frame,
    offerings: [
      "Custom family photo frames",
      "Wedding and couple frames",
      "Certificate framing",
      "Artwork framing",
      "Decorative and designer frames",
      "MDF and wooden frame options",
      "Custom frame sizes",
      "Wall-mounted display frames",
    ],
    ctaLabel: "Enquire About Custom Framing",
    ctaHref: "/contact?service=custom-framing",
  },
  {
    id: "lamination-mounting",
    title: "Commercial Lamination & Mounting",
    description:
      "Professional lamination and mounting solutions for photography studios, printing centres and individual customers.",
    note: "Discuss your print sizes, document formats, and mounting requirements with our team.",
    image: "/images/home/equipment-laminator.jpg",
    imageAlt: "Commercial lamination and mounting equipment",
    icon: Layers,
    offerings: [
      "Photo lamination",
      "Document lamination",
      "Certificate lamination",
      "Poster lamination",
      "Hot and cold lamination services",
      "Photo mounting",
      "Album and display mounting",
    ],
    ctaLabel: "Enquire About Lamination",
    ctaHref: "/contact?service=lamination",
  },
  {
    id: "glass-works",
    title: "Precision Glass Works",
    description:
      "Glass solutions for photo frames, mirrors and decorative applications, tailored to specific requirements.",
    note: "Reach out with your frame measurements or mirror specifications for tailored glass cutting.",
    image: "/qa-products/antiglare-glass.svg",
    imageAlt: "Precision cut photo frame glass and glazing",
    icon: Sparkles,
    offerings: [
      "Photo frame glass",
      "Custom-sized glass",
      "Protective glazing",
      "Mirror solutions",
      "Glass replacement",
      "Glass requirements for framing projects",
    ],
    ctaLabel: "Enquire About Glass Works",
    ctaHref: "/contact?service=glass-works",
  },
  {
    id: "machinery-consumables",
    title: "Machinery Guidance & Consumables Supply",
    description:
      "Professional framing and lamination equipment, consumables and accessories for studios and commercial printing businesses.",
    note: "Machine specifications, product compatibility, pricing and bulk availability can be discussed directly through an enquiry.",
    image: "/images/home/hero-frames.jpg",
    imageAlt: "Framing supplies, lamination machines, and studio consumables",
    icon: Settings2,
    offerings: [
      "Pouch lamination machines",
      "Roll lamination machines",
      "Hot and cold lamination machines",
      "Thermal lamination pouches",
      "Lamination films and rolls",
      "Machine accessories",
      "Compatible spare parts",
      "Framing supplies and materials",
    ],
    ctaLabel: "Explore Equipment & Supplies",
    ctaHref: "/products?category=lamination-machines",
  },
] as const;

export function ServiceOverviewSection() {
  return (
    <section id="service-overview" className="bg-[#080B10] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
            SERVICE OVERVIEW
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            Four Core Pillars of Craft &amp; Supply
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Dedicated services tailored for personal keepsakes, photography studios, printing
            centres, and commercial framing professionals.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {SERVICE_FAMILIES.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.id}
                id={service.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1726] transition duration-300 hover:border-[#C69A48]/50"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-slate-800/80 bg-[#071421]">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1726]/90 via-[#0b1726]/20 to-transparent" />
                  <div className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#C69A48]/40 bg-[#071421]/90 text-[#E3C27B]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <h3 className="font-serif text-2xl font-semibold text-white">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {service.description}
                  </p>

                  <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {service.offerings.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C69A48]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 border-t border-slate-800/80 pt-4 text-xs leading-relaxed text-slate-400">
                    {service.note}
                  </p>

                  <div className="mt-6">
                    <Link
                      href={service.ctaHref}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#C69A48]/45 bg-[#071421] px-5 py-2.5 text-sm font-semibold text-[#E3C27B] transition hover:border-[#C69A48] hover:bg-[#C69A48] hover:text-[#071421]"
                    >
                      {service.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
