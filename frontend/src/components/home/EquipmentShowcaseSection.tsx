import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Wrench } from "lucide-react";

const EQUIPMENT_HIGHLIGHTS = [
  "Pouch lamination machines",
  "Roll lamination machines",
  "Hot and cold lamination machines",
  "Lamination films & rolls",
  "Thermal pouches",
  "Machine spare parts & accessories",
];

export function EquipmentShowcaseSection() {
  return (
    <section className="py-16 bg-[#071421]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-[#C69A48]/35 bg-[#080B10] shadow-2xl">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/images/home/equipment-laminator.jpg"
                  alt="Commercial thermal and cold roll lamination machine with glossy and velvet lamination film rolls"
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E3C27B]">
              <Wrench className="w-4 h-4 text-[#C69A48]" /> Professional
              Equipment Showcase
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Lamination Machines &amp; Studio Supplies
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip your photo studio, print centre, or framing shop with
              dependable lamination machinery and compatible consumables. Add
              machines and film rolls to your cart to enquire directly about
              specifications, film compatibility, and current availability.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-200">
              {EQUIPMENT_HIGHLIGHTS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0b1726] border border-slate-800"
                >
                  <Check className="w-3.5 h-3.5 text-[#C69A48] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/products?category=lamination-machines"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-colors"
              >
                Explore Equipment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products?category=lamination-consumables"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Browse Films &amp; Pouches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
