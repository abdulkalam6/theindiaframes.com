import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-6 selection:bg-[#d4af37] selection:text-black">
      <main className="w-full max-w-2xl bg-[#0f172a]/80 backdrop-blur border border-[#d4af37]/30 rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">
        <div className="relative w-64 h-36 md:w-80 md:h-44 mb-6">
          <Image
            src="/logo/ifc-logo.png"
            alt="The India Frames Logo"
            fill
            priority
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#e5c07b] tracking-wide mb-2">
          The India Frames
        </h1>
        <p className="text-gray-300 text-sm md:text-base italic mb-6">
          Where Memories Become Art • Cumbum, Tamil Nadu
        </p>

        <div className="w-full border-t border-[#d4af37]/20 my-4" />

        <div className="bg-[#1e293b]/60 rounded-xl p-4 w-full text-left text-sm space-y-2 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Environment:</span>
            <span className="text-emerald-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
              Phase 0 Scaffold Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Frontend Stack:</span>
            <span className="text-slate-200 font-mono text-xs">Next.js App Router + TypeScript</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Brand Identity:</span>
            <span className="text-amber-300/90 font-mono text-xs">IFC Classic Navy &amp; Gold</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Repository foundation ready. Next: Phase 1 design system and storefront shell.
        </p>
      </main>
    </div>
  );
}
