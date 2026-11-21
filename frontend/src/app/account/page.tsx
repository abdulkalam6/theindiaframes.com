"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { ArrowLeft, LogOut, ShieldCheck, User } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  account_type: "retail" | "wholesale" | "owner";
  wholesale_status: "not_applied" | "pending" | "approved" | "rejected";
}

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiClient<UserProfile>("auth/me");
        if (res.data) {
          setUser(res.data);
        } else {
          window.location.href = "/login";
        }
      } catch {
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading customer profile...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="pb-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <h1 className="text-2xl font-serif font-bold text-white">
            My Customer Account
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          Sign Out
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <div className="p-6 rounded-xl bg-[#0b1726] border border-slate-800 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C69A48]/20 border border-[#C69A48]/50 flex items-center justify-center text-[#E3C27B]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{user.name}</h2>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Account Type:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {user.account_type}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Wholesale Status:</span>
              <span
                className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] inline-block mt-0.5 ${
                  user.wholesale_status === "approved"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : user.wholesale_status === "pending"
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {user.wholesale_status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {user.account_type === "owner" && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#0d1a29] to-[#071421] border border-[#C69A48]/40 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C69A48]" />
                Owner Management Portals
              </h3>
              <p className="text-xs text-slate-400">
                Access enquiries, customer directory, offline sales, and payment
                records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs"
              >
                Admin Panel
              </Link>
              <Link
                href="/billing"
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs"
              >
                Billing Portal
              </Link>
            </div>
          </div>
        )}

        {user.account_type !== "owner" && user.wholesale_status === "not_applied" && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#0d1a29] to-[#071421] border border-[#C69A48]/30 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C69A48]" />
                Are you a photo framing shop or printer?
              </h3>
              <p className="text-xs text-slate-400">
                Submit GSTIN and proof of business to unlock wholesale prices.
              </p>
            </div>
            <Link
              href="/wholesale"
              className="px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs"
            >
              Apply
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
