import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "The India Frames | Where Memories Become Art",
  description:
    "Premium photo frames, framing materials, lamination machines and consumables. Retail catalogue and business wholesale supplier in Cumbum, Tamil Nadu.",
  icons: {
    icon: "/logo/ifc-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#071421] text-slate-100 antialiased">
        <Header />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
