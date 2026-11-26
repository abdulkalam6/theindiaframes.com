import { BadgeCheck, ClipboardList, Compass, MessageSquare } from "lucide-react";

const PROCESS_STEPS = [
  {
    step: "Step 1",
    title: "Explore Services or Products",
    description:
      "Browse our framing, lamination, printing, glass, and equipment offerings to see what fits your need.",
    icon: Compass,
  },
  {
    step: "Step 2",
    title: "Share Your Requirements",
    description:
      "Send your photo dimensions, frame preferences, machine questions, or bulk enquiry details.",
    icon: ClipboardList,
  },
  {
    step: "Step 3",
    title: "Receive Guidance & Assistance",
    description:
      "Our team reviews your specifications and advises on suitable materials, sizing, and options.",
    icon: MessageSquare,
  },
  {
    step: "Step 4",
    title: "Confirm Your Requirement",
    description:
      "Finalise your custom service or supply request directly with our team before work begins.",
    icon: BadgeCheck,
  },
] as const;

export function ServiceProcessSection() {
  return (
    <section
      id="service-process"
      className="border-y border-slate-800/80 bg-[#071421] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C69A48] uppercase">
            OUR SERVICE PROCESS
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
            How We Work With You
          </h2>
          <p className="mt-3 text-base text-slate-400">
            A clear, personal workflow from initial enquiry to confirmed specification.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col rounded-2xl border border-slate-800 bg-[#0b1726] p-6"
              >
                {index < PROCESS_STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-10 -right-3 hidden h-px w-6 bg-[#C69A48]/40 lg:block"
                  />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.18em] text-[#C69A48] uppercase">
                    {item.step}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#C69A48]/30 bg-[#071421] text-[#E3C27B]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-5 font-serif text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
