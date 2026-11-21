"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  ClipboardList,
  LogOut,
  MessageCircle,
  ShieldCheck,
  User,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  account_type: "retail" | "wholesale" | "owner";
  wholesale_status: "not_applied" | "pending" | "approved" | "rejected";
}

interface CustomerEnquiry {
  id: string;
  enquiry_id: string;
  enquiry_status: string;
  pricing_tier: "retail" | "wholesale";
  estimated_total_paise: number;
  quoted_total_paise?: number | null;
  payment_summary: {
    received_total_paise: number;
    outstanding_paise: number;
    payment_status: "unpaid" | "partial" | "paid";
  };
  items: Array<{
    product_name: string;
    variant_label: string;
    quantity: number;
    custom_photo?: { asset_id: string } | null;
  }>;
  whatsapp_url: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-950 text-amber-400 border border-amber-800",
  quoted: "bg-blue-950 text-blue-400 border border-blue-800",
  accepted: "bg-cyan-950 text-cyan-400 border border-cyan-800",
  in_progress: "bg-violet-950 text-violet-400 border border-violet-800",
  completed: "bg-emerald-950 text-emerald-400 border border-emerald-800",
  cancelled: "bg-slate-800 text-slate-500 border border-slate-700",
};

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiClient<UserProfile>("auth/me");
        if (res.data) {
          setUser(res.data);
          const enqRes = await apiClient<CustomerEnquiry[]>("enquiries");
          if (enqRes.data) setEnquiries(enqRes.data);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading customer profile...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="pb-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <h1 className="text-2xl font-serif font-bold text-white">
            My Account
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
                Access enquiries, catalogue, wholesale reviews, settings, and
                billing.
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

        {user.account_type !== "owner" &&
          user.wholesale_status === "not_applied" && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-[#0d1a29] to-[#071421] border border-[#C69A48]/30 flex items-center justify-between gap-4">
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
                className="px-4 py-2 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs shrink-0"
              >
                Apply
              </Link>
            </div>
          )}

        {/* My Order Enquiries History */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#C69A48]" />
              My Order Enquiries ({enquiries.length})
            </h2>
            <Link
              href="/products"
              className="text-xs text-[#E3C27B] hover:underline"
            >
              New Enquiry →
            </Link>
          </div>

          {enquiries.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0b1726] border border-slate-800 text-center text-xs text-slate-500">
              You have not submitted any enquiries yet.
            </div>
          ) : (
            <div className="space-y-4">
              {enquiries.map((enq) => {
                const payable =
                  enq.quoted_total_paise ?? enq.estimated_total_paise;
                return (
                  <div
                    key={enq.id}
                    className="p-5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#E3C27B]">
                          {enq.enquiry_id}
                        </span>
                        <span className="text-slate-500 ml-2">
                          {formatDate(enq.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                            STATUS_STYLES[enq.enquiry_status] ??
                            "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {enq.enquiry_status.replace("_", " ")}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] capitalize bg-slate-800 text-slate-300">
                          Payment: {enq.payment_summary.payment_status}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-1 text-slate-300 border-t border-slate-800/80 pt-2">
                      {enq.items.map((it, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>
                            {it.product_name} ({it.variant_label}) ×{" "}
                            {it.quantity}
                          </span>
                          {it.custom_photo && (
                            <span className="px-1.5 py-0.5 rounded bg-[#C69A48]/20 text-[#E3C27B] text-[10px] font-semibold">
                              Custom Photo
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-800/80">
                      <div className="space-x-3 text-slate-400">
                        <span>
                          {enq.quoted_total_paise !== null &&
                          enq.quoted_total_paise !== undefined
                            ? "Quoted:"
                            : "Est. Total:"}{" "}
                          <strong className="text-white">
                            {formatPaise(payable)}
                          </strong>
                        </span>
                        {enq.payment_summary.received_total_paise > 0 && (
                          <span className="text-emerald-400">
                            Paid:{" "}
                            {formatPaise(
                              enq.payment_summary.received_total_paise
                            )}
                          </span>
                        )}
                      </div>
                      <a
                        href={enq.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Follow up on WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
