"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { ArrowLeft, Lock, Mail, Receipt, ShieldAlert } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  account_type: "retail" | "wholesale" | "owner";
}

export default function BillingLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const loginRes = await apiClient("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const loginDetail = (loginRes as { detail?: string }).detail;
      if (loginRes.error || loginDetail) {
        setErrorMsg(
          loginRes.error?.message || loginDetail || "Invalid credentials."
        );
        return;
      }

      // Same owner authentication as admin: verify session belongs to owner
      const meRes = await apiClient<UserProfile>("auth/me");
      if (!meRes.data || meRes.data.account_type !== "owner") {
        await apiClient("auth/logout", { method: "POST" });
        setErrorMsg(
          "Owner account privileges are required to access the Billing portal."
        );
        return;
      }

      router.push("/billing");
    } catch {
      setErrorMsg("Failed to connect to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060e1a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0b1726] border border-[#C69A48]/30 rounded-2xl p-8 shadow-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#C69A48]/15 border border-[#C69A48]/40 flex items-center justify-center text-[#E3C27B]">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#C69A48] font-semibold uppercase tracking-widest block">
              Owner Billing Portal
            </span>
            <h1 className="text-xl font-serif font-bold text-white leading-tight">
              Billing Sign In
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Sign in with your owner credentials to view online enquiry billing,
          offline sales, and payment records.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Owner Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@theindiaframes.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-[#C69A48] focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-[#C69A48] focus:outline-none"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-all shadow-md mt-2 disabled:opacity-50"
          >
            {loading ? "Verifying owner session…" : "Sign In to Billing"}
          </button>
        </form>
      </div>
    </div>
  );
}
