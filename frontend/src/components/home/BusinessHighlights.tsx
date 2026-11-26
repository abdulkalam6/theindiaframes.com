import { Frame, Layers, Printer, ShieldCheck } from "lucide-react";

const HIGHLIGHTS = [
  {
    title: "Retail & Wholesale",
    description:
      "Single frames and personalised gifts for households, plus owner-approved trade pricing for verified businesses.",
    icon: ShieldCheck,
  },
  {
    title: "Customised Framing",
    description:
      "Tailored framing for portraits, wedding photography, certificates, artwork, and custom mirror assemblies.",
    icon: Frame,
  },
  {
    title: "Professional Lamination Equipment",
    description:
      "Commercial pouch, roll, hot and cold lamination machines built for photo studios and printing centres.",
    icon: Printer,
  },
  {
    title: "Framing Accessories & Materials",
    description:
      "Mouldings, MDF backing boards, clear and non-glare glass, hooks, hangers, and lamination consumables.",
    icon: Layers,
  },
];

export function BusinessHighlights() {
  return (
    <section
      id="highlights"
      className="py-10 bg-[#080B10] border-b border-[#C69A48]/20"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-xl bg-[#0b1726]/80 border border-slate-800 hover:border-[#C69A48]/40 transition-colors flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-[#C69A48]/15 border border-[#C69A48]/30 flex items-center justify-center text-[#E3C27B] shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
