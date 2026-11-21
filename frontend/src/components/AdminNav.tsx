"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { LogOut } from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/wholesale", label: "Wholesale" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export function AdminNav({ title }: { title: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await apiClient("auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <header className="border-b border-slate-800 bg-[#080f1d] px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div>
        <span className="text-xs text-[#C69A48] font-semibold uppercase tracking-widest">
          Owner Panel
        </span>
        <h1 className="text-lg font-serif font-bold text-white leading-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <nav className="flex items-center gap-3.5 text-xs text-slate-400 flex-wrap">
          {ADMIN_LINKS.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "text-[#E3C27B] font-semibold"
                    : "hover:text-white transition-colors"
                }
              >
                {item.label}
              </Link>
            );
          })}
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
  );
}
