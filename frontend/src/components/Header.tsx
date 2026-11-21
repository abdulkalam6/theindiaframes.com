"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ShoppingBag, User, Menu, X, Phone, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { apiClient } from "@/lib/api";

interface NavUser {
  id: string;
  name: string;
  account_type: "retail" | "wholesale" | "owner";
  wholesale_status: "not_applied" | "pending" | "approved" | "rejected";
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    setMounted(true);
    let active = true;
    apiClient<NavUser>("auth/me")
      .then((res) => {
        if (active && res.data) setUser(res.data);
      })
      .catch(() => {
        // Visitor mode
      });
    return () => {
      active = false;
    };
  }, []);

  const navLinks = [
    { label: "Photo Frames", href: "/products?category=photo-frames" },
    { label: "Glass & Backing", href: "/products?category=glass-and-backing" },
    {
      label: "Lamination Machines",
      href: "/products?category=lamination-machines",
    },
    {
      label: "Lamination Films",
      href: "/products?category=lamination-consumables",
    },
    { label: "Services", href: "/services" },
    { label: "Personalised Gifts", href: "/personalised-gifts" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "About & Contact", href: "/contact" },
  ];

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <header className="sticky top-0 z-50 bg-[#071421]/95 backdrop-blur border-b border-[#C69A48]/20 transition-all print:hidden">
      {/* Top Announcement Bar */}
      <div className="bg-[#080B10] border-b border-[#C69A48]/15 px-4 py-1.5 text-xs text-[#E3C27B] flex items-center justify-between">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <p className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C69A48] animate-pulse" />
            <span>
              Retail &amp; Business Wholesale Supplier • Cumbum, Tamil Nadu
            </span>
          </p>
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300">
            {user?.account_type === "owner" ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="text-[#E3C27B] hover:text-white font-semibold"
                >
                  Admin Panel
                </Link>
                <Link
                  href="/billing"
                  className="text-[#E3C27B] hover:text-white font-semibold"
                >
                  Billing Portal
                </Link>
              </div>
            ) : user?.wholesale_status === "approved" ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Wholesale Pricing Active
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#C69A48]" /> Owner Direct
                Support
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-36 h-14 sm:w-44 sm:h-16 transition-transform group-hover:scale-[1.02]">
            <Image
              src="/logo/ifc-logo.png"
              alt="The India Frames Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-200">
          {navLinks.slice(0, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#E3C27B] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/wholesale"
            className="text-[#E3C27B] hover:text-white px-3 py-1 rounded border border-[#C69A48]/40 hover:border-[#C69A48] transition-all bg-[#C69A48]/10"
          >
            Wholesale
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href={user ? "/account" : "/login"}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 hover:text-[#E3C27B] p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            aria-label={user ? "My Account" : "Account Login"}
          >
            <User className="w-4 h-4 text-[#C69A48]" />
            <span className="hidden sm:inline">
              {user ? firstName : "Sign In"}
            </span>
          </Link>

          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 text-xs sm:text-sm bg-[#C69A48]/20 hover:bg-[#C69A48]/30 border border-[#C69A48]/50 text-[#E3C27B] px-3 py-2 rounded-lg transition-all"
            aria-label="Enquiry Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#E3C27B]" />
            <span className="hidden sm:inline font-medium">Cart</span>
            <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold bg-[#C69A48] text-black rounded-full">
              {mounted ? totalItems : 0}
            </span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#C69A48]/20 bg-[#071421] px-4 py-5 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-slate-200 hover:text-[#E3C27B] hover:bg-slate-800/40 rounded transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
            {user?.account_type === "owner" && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 text-[#E3C27B] font-semibold hover:bg-slate-800/40 rounded text-sm"
                >
                  Owner Admin Panel
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 text-[#E3C27B] font-semibold hover:bg-slate-800/40 rounded text-sm"
                >
                  Owner Billing Portal
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
