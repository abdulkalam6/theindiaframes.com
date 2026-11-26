import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Printer } from "lucide-react";

const PRINTING_HIGHLIGHTS = [
  "Digital photo printing",
  "Poster printing",
  "Photo print requirements for custom framing",
  "Printing for personalised gifts",
  "Different print requirements based on customer needs",
] as const;

export function DigitalPrintingSection() {
  return (
    <section
      id="digital-printing"
      className="border-y border-slate-800/80 bg-[#071421] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#C69A48]/30 bg-[#0b1726]">
              <Image
                src="/images/services/digital-printing.jpg"
                alt="Editorial studio view of digital photo prints and framed photography"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C69A48]/30 bg-[#0b1726] px-3.5 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#E3C27B] uppercase">
              <Printer className="h-3.5 w-3.5" />
              Digital Printing
            </div>
            <h2 className="mt-4 font-serif text-3xl font-bold text-white sm:text-4xl">
              Dedicated Digital Printing Services
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Prepare your photographs, posters, and custom gift visuals with printing tailored to
              fit our framing and lamination services seamlessly under one roof.
            </p>

            <ul className="mt-6 space-y-3">
              {PRINTING_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-200 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C69A48]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/contact?service=digital-printing"
                className="inline-flex items-center gap-2 rounded-lg bg-[#C69A48] px-6 py-3 text-sm font-semibold text-[#071421] transition hover:bg-[#E3C27B]"
              >
                Enquire About Printing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
