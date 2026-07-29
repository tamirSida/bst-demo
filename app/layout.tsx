import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";

// The primary face is BST's own FbParking, self-hosted and declared in
// globals.css. Heebo stays wired only as the fallback that renders while the
// brand woff2 files load, and for any glyph they don't cover — so it carries the
// same 300/400/500 range and nothing heavier.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500"],
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
