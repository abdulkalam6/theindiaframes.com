import Link from "next/link";
import { ArrowLeft, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

export default function WholesalePage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="pb-6 border-b border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Wholesale Business Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          For photo framing shops, digital printing studios and commercial workshops.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="p-5 rounded-xl bg-[#0b1726] border border-[#C69A48]/30">
          <h2 className="text-sm font-semibold text-[#E3C27B] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C69A48]" /> Mandatory Requirements for Approval
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Valid 15-character Indian GSTIN
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Registered business legal name and commercial address
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Proof of business document (GST certificate or trade registration)
            </li>
          </ul>
        </div>

        {/* Application Shell */}
        <div className="p-6 rounded-xl bg-[#080B10] border border-slate-800 text-center">
          <FileText className="w-10 h-10 text-[#C69A48] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            Wholesale Form Shell
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Full document upload and business verification submission flow will be activated in Phase 4.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black text-xs font-semibold inline-block transition-all"
            >
              Sign In First to Apply
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
