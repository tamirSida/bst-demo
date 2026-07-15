import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מגדלור — ניהול לידים והתחדשות עירונית",
  description: "מערכת סינון וניתוח לידים לפיתוח עסקי — קבוצת BST",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
