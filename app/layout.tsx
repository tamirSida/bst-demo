import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";
import { BrandStyle } from "@/components/BrandStyle";
import { activeBrand } from "@/lib/brand/config";

// Default typeface. A brand can override --font-sans entirely (see
// lib/brand/config.ts); this stays as the shipped default and the fallback.
// Weights stop at 500 — the design never uses a bold.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = (() => {
  const brand = activeBrand();
  return { title: brand.productTitle, description: brand.productDescription };
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="min-h-full antialiased">
        <BrandStyle />
        {children}
      </body>
    </html>
  );
}
