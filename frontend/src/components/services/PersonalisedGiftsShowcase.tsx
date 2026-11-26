import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

const GIFT_OCCASIONS = [
  {
    title: "Birthday Gifts",
    subtitle: "Thoughtful custom photo frames",
    image: "/images/home/occasion-memories.jpg",
  },
  {
    title: "Wedding Gifts",
    subtitle: "Timeless keepsakes for newlyweds",
    image: "/images/home/hero-frames.jpg",
  },
  {
    title: "Anniversary Gifts",
    subtitle: "Framed milestones worth cherishing",
    image: "/images/home/custom-framing-workshop.jpg",
  },
  {
    title: "Couple Photo Frames",
    subtitle: "Paired portraits & display pieces",
    image: "/images/home/occasion-memories.jpg",
  },
  {
    title: "Family Photo Frames",
    subtitle: "Wall-mounted & tabletop displays",
    image: "/images/home/hero-frames.jpg",
  },
  {
    title: "Festival Gifts",
    subtitle: "Devotional & celebratory frames",
    image: "/qa-products/teak-gold-frame.svg",
  },
  {
    title: "Special Occasion Gifts",
    subtitle: "Certificates, tributes & celebrations",
    image: "/qa-products/matte-black-frame.svg",
  },
] as const;

export function PersonalisedGiftsShowcase() {
  return (
    <section id="personalised-gifts" className="bg-[#080B10] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
              <Gift className="h-4 w-4" />
              PERSONALISED GIFTS &amp; SPECIAL OCCASIONS
            </div>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
              Meaningful Frames for Every Milestone
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              Create custom-framed keepsakes for celebrations, family gatherings, and memorable
              occasions.
            </p>
          </div>

          <Link
            href="/personalised-gifts"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#C69A48]/45 bg-[#0b1726] px-5 py-3 text-sm font-semibold text-[#E3C27B] transition hover:border-[#C69A48] hover:bg-[#C69A48] hover:text-[#071421]"
          >
            Explore Personalised Gifts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GIFT_OCCASIONS.map((occasion, idx) => (
            <Link
              key={occasion.title}
              href="/personalised-gifts"
              className={`group relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b1726] transition hover:border-[#C69A48]/50 ${
                idx === 0 ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#071421]">
                <Image
                  src={occasion.image}
                  alt={occasion.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071421] via-[#071421]/35 to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="font-serif text-lg font-semibold text-white group-hover:text-[#E3C27B]">
                  {occasion.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400">{occasion.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
