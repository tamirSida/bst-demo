import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";

// Heebo — closest free match to BST's proprietary "fbparking". Light weights
// (300) carry the airy headings; 400 body. See DESIGN-SPEC.md.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BST — ניהול לידים והתחדשות עירונית",
  description: "מערכת סינון וניתוח לידים לפיתוח עסקי — קבוצת BST",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
