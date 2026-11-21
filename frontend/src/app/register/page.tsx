"use client";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api";
import { ArrowLeft, Lock, Mail, User, ShieldAlert } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedType, setRequestedType] = useState<"retail" | "wholesale">("retail");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await apiClient("auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          requested_account_type: requestedType,
        }),
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Registration failed.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch {
      setErrorMsg("Failed to connect to registration service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="bg-[#0b1726] border border-[#C69A48]/30 rounded-2xl p-8 shadow-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>

        <h1 className="text-2xl font-serif font-bold text-white mb-1">
          Create Account
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Register to preserve cart enquiries and request wholesale access.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            {errorMsg}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
            Account created! Redirecting to sign in...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full pl-9 pr-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-[#C69A48] focus:outline-none"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-[#C69A48] focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Password (min 8 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-[#C69A48] focus:outline-none"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Account Registration Intent
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRequestedType("retail")}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  requestedType === "retail"
                    ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                    : "bg-[#071421] border-slate-700 text-slate-400"
                }`}
              >
                Retail Customer
              </button>
              <button
                type="button"
                onClick={() => setRequestedType("wholesale")}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  requestedType === "wholesale"
                    ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                    : "bg-[#071421] border-slate-700 text-slate-400"
                }`}
              >
                Wholesale Business
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-all shadow-md mt-4 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="text-[#E3C27B] hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
