"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { LogOut, User } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  account_type: "retail" | "wholesale" | "owner";
  wholesale_status: "not_applied" | "pending" | "approved" | "rejected";
  created_at?: string;
}

const WS_STATUS_STYLES: Record<string, string> = {
  not_applied: "bg-slate-800 text-slate-500",
  pending: "bg-amber-950 text-amber-400 border border-amber-800",
  approved: "bg-emerald-950 text-emerald-400 border border-emerald-800",
  rejected: "bg-red-950 text-red-400 border border-red-800",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient<Customer[]>("admin/customers");
        if (res.data) {
          setCustomers(res.data);
        } else {
          setError(res.error?.message ?? "Access denied.");
        }
      } catch {
        setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      {/* Top Nav */}
      <header className="border-b border-slate-800 bg-[#080f1d] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#C69A48] font-semibold uppercase tracking-widest">
            Owner Panel
          </span>
          <h1 className="text-lg font-serif font-bold text-white leading-tight">
            Customer Directory
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <Link href="/admin" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin/enquiries" className="hover:text-white transition-colors">
              Enquiries
            </Link>
            <Link href="/admin/customers" className="text-[#E3C27B] font-semibold">
              Customers
            </Link>
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <User className="w-4 h-4" />
          {loading ? "Loading…" : `${customers.length} customer${customers.length !== 1 ? "s" : ""} registered`}
        </div>

        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && customers.length === 0 && !error && (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 p-12 text-center text-slate-500 text-sm">
            No customers registered yet.
          </div>
        )}

        {!loading && customers.length > 0 && (
          <div className="rounded-xl bg-[#0b1726] border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Account Type</th>
                  <th className="text-left px-5 py-3">Wholesale Status</th>
                  <th className="text-left px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors ${
                      idx === customers.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-200 font-medium">
                      {c.name}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{c.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                          c.account_type === "wholesale"
                            ? "bg-violet-950 text-violet-400 border border-violet-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.account_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                          WS_STATUS_STYLES[c.wholesale_status] ??
                          "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.wholesale_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
