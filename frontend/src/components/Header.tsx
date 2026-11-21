"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ShoppingBag, User, Menu, X, Phone } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Photo Frames", href: "/products?category=photo-frames" },
    { label: "Frame Accessories", href: "/products?category=frame-accessories" },
    { label: "Lamination Machines", href: "/products?category=lamination-machines" },
    { label: "Lamination Accessories", href: "/products?category=lamination-accessories" },
    { label: "Services", href: "/services" },
    { label: "Personalised Gifts", href: "/personalised-gifts" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "About & Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#071421]/95 backdrop-blur border-b border-[#C69A48]/20 transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-[#080B10] border-b border-[#C69A48]/15 px-4 py-1.5 text-xs text-[#E3C27B] flex items-center justify-between">
        <div className="container mx-auto flex items-center justify-between">
          <p className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C69A48] animate-pulse" />
            <span>Retail &amp; Business Wholesale Supplier • Cumbum, Tamil Nadu</span>
          </p>
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#C69A48]" /> Owner Direct Support
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
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

        {/* Action Controls: Account, Cart, Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 hover:text-[#E3C27B] p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            aria-label="Account Login"
          >
            <User className="w-4 h-4 text-[#C69A48]" />
            <span className="hidden sm:inline">Account</span>
          </Link>

          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 text-xs sm:text-sm bg-[#C69A48]/20 hover:bg-[#C69A48]/30 border border-[#C69A48]/50 text-[#E3C27B] px-3 py-2 rounded-lg transition-all"
            aria-label="Enquiry Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#E3C27B]" />
            <span className="hidden sm:inline font-medium">Cart</span>
            <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold bg-[#C69A48] text-black rounded-full">
              0
            </span>
          </Link>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
          </nav>
        </div>
      )}
    </header>
  );
}
