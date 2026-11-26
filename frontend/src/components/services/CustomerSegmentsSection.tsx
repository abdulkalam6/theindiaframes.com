import { Building2, Camera, Store, User } from "lucide-react";

const CUSTOMER_SEGMENTS = [
  {
    title: "Individual Customers",
    description:
      "Personal photo framing, certificate preservation, mirror solutions, and custom-framed gifts for birthdays, weddings, and family milestones.",
    icon: User,
  },
  {
    title: "Photography Studios",
    description:
      "Consistent photo lamination, album and portrait mounting, custom frame sizes, and dependable glazing supplies for client deliveries.",
    icon: Camera,
  },
  {
    title: "Printing Centres",
    description:
      "Commercial pouch and roll lamination machines, thermal pouches, films, compatible spare parts, and poster lamination support.",
    icon: Building2,
  },
  {
    title: "Framing Shops & Retailers",
    description:
      "Framing mouldings, MDF and backing boards, precision-cut glass, hooks, hangers, and wholesale-grade materials via business enquiry.",
    icon: Store,
  },
] as const;

export function CustomerSegmentsSection() {
  return (
    <section id="who-we-serve" className="bg-[#080B10] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
            WHO WE SERVE
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            Services for Individuals &amp; Businesses
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Whether you are framing a single family keepsake or equipping a commercial studio, our
            workshop supports your requirements.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_SEGMENTS.map((segment) => {
            const Icon = segment.icon;
            return (
              <div
                key={segment.title}
                className="flex flex-col rounded-2xl border border-slate-800 bg-[#0b1726] p-6 transition hover:border-[#C69A48]/45"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C69A48]/30 bg-[#071421] text-[#E3C27B]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-serif text-xl font-semibold text-white">
                  {segment.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  {segment.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
