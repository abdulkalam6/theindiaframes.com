"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ArrowLeft, Lock, Mail, ShieldAlert } from "lucide-react";

interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    account_type: "retail" | "wholesale" | "owner";
    wholesale_status: "not_applied" | "pending" | "approved" | "rejected";
  };
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await apiClient<LoginResult>("auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.error || !res.data) {
        setErrorMsg(res.error?.message || "Invalid email or password.");
      } else {
        setSuccess(true);
        const safeRedirect =
          redirectParam && redirectParam.startsWith("/")
            ? redirectParam
            : null;
        const dest =
          safeRedirect ||
          (res.data.user.account_type === "owner" ? "/admin" : "/account");
        router.push(dest);
      }
    } catch {
      setErrorMsg("Failed to connect to authentication service.");
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
          Sign In
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Sign in to submit enquiry carts, view wholesale pricing, or access
          owner tools.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            {errorMsg}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
            Sign-in successful! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <GoogleSignInButton
          onSuccess={(acctType) => {
            const safeRedirect =
              redirectParam && redirectParam.startsWith("/")
                ? redirectParam
                : null;
            router.push(
              safeRedirect || (acctType === "owner" ? "/admin" : "/account")
            );
          }}
          onError={(msg) => setErrorMsg(msg)}
        />

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#E3C27B] hover:underline font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
          Loading sign in…
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
