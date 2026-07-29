import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { MobileNav, SidebarNav } from "./SidebarNav";
import { LogoutButton } from "./LogoutButton";
import { requireAuth } from "@/lib/auth/session";
import { isAuthDisabled } from "@/lib/auth/guard";

import { todayLabel } from "@/lib/dates";

/**
 * The app shell: a fixed RTL sidebar on the right, a top bar with the brand +
 * date, and a calm canvas content area. Collapses to a horizontal nav on mobile.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { email } = await requireAuth();
  const authOn = !isAuthDisabled();

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Sidebar (right in RTL) — the dark brand bar carrying the logo */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-brand-600 border-s border-brand-700 relative overflow-hidden">
        <div className="flex items-center px-5 h-20 border-b border-brand-700/70">
          <Logo className="h-9 text-logo-cream" />
        </div>
        <SidebarNav />
        <div className="mt-auto p-4 space-y-3 relative z-10">
          {authOn && <LogoutButton email={email} />}
          <p className="text-xs text-logo-cream/40">התחדשות עירונית · פיתוח עסקי</p>
        </div>
        {/* Subtle geometric line-art — concentric quarter-circles in the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -start-24 w-56 h-56 rounded-full border border-logo-cream/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -start-12 w-40 h-40 rounded-full border border-logo-cream/[0.06]"
        />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile only: the dark-olive strip carrying the cream logo + nav. On
            desktop the sidebar already does both jobs, so a second bar would be
            64px of chrome holding a single date — the date moves into the page
            instead, where it reads as context rather than furniture. */}
        <header className="lg:hidden sticky top-0 z-30 bg-brand-600 border-b border-brand-700">
          <div className="flex items-center justify-between gap-3 px-5 h-16">
            <Logo className="h-7 text-logo-cream" />
            <p className="text-sm text-logo-cream/70">{todayLabel()}</p>
          </div>
          <MobileNav />
        </header>

        {/* No date line here any more — pages with a hero carry it themselves,
            and a second copy above the hero read as a stray label. */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1400px] w-full mx-auto overflow-x-clip">
          {children}
        </main>
      </div>
    </div>
  );
}
