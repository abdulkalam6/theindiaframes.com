import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#080B10] border-t border-[#C69A48]/20 text-slate-400 text-sm mt-auto">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand identity column */}
        <div className="space-y-4 md:col-span-1">
          <div className="relative w-40 h-16">
            <Image
              src="/logo/ifc-logo.png"
              alt="The India Frames"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Where Memories Become Art. Premium photo frames, framing materials, lamination machines, consumables and custom glass works.
          </p>
          <p className="text-xs text-[#E3C27B]">
            Cumbum, Theni District, Tamil Nadu, India.
          </p>
        </div>

        {/* Product Catalogue */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E3C27B]">
            Catalogue
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/products?category=photo-frames" className="hover:text-white transition-colors">
                Photo Frames
              </Link>
            </li>
            <li>
              <Link href="/products?category=frame-accessories" className="hover:text-white transition-colors">
                Frame Accessories
              </Link>
            </li>
            <li>
              <Link href="/products?category=lamination-machines" className="hover:text-white transition-colors">
                Lamination Machines
              </Link>
            </li>
            <li>
              <Link href="/products?category=lamination-accessories" className="hover:text-white transition-colors">
                Lamination Accessories
              </Link>
            </li>
            <li>
              <Link href="/personalised-gifts" className="hover:text-white transition-colors">
                Personalised Gifts
              </Link>
            </li>
          </ul>
        </div>

        {/* Business & Services */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E3C27B]">
            Business &amp; Services
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/wholesale" className="hover:text-white transition-colors">
                Wholesale Application (GSTIN required)
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Custom Framing &amp; Glass Works
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                Printing &amp; Lamination Services
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white transition-colors">
                Enquiry Cart &amp; WhatsApp Handoff
              </Link>
            </li>
            <li>
              <Link href="/billing/login" className="text-slate-500 hover:text-slate-300 transition-colors">
                Owner Portal Access
              </Link>
            </li>
          </ul>
        </div>

        {/* Trust & Policy */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E3C27B]">
            Order &amp; Enquiry Information
          </h3>
          <p className="text-xs leading-relaxed text-slate-400">
            Submit your multi-item cart as a direct enquiry. Our team reviews availability and contacts you directly via WhatsApp for final quotes and fulfilment.
          </p>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">
              No online card transactions required in v1.
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 The India Frames. All rights reserved.</p>
      </div>
    </footer>
  );
}
