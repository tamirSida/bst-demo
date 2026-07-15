import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTowerObservation } from "@fortawesome/free-solid-svg-icons";
import { MobileNav, SidebarNav } from "./SidebarNav";

/** Hebrew long date, e.g. "יום רביעי, 15 ביולי 2026". */
function todayLabel(): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * The app shell: a fixed RTL sidebar on the right, a top bar with the brand +
 * date, and a calm canvas content area. Collapses to a horizontal nav on mobile.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Sidebar (right in RTL) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface border-s border-line">
        <div className="flex items-center gap-3 px-5 h-20 border-b border-line">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-600 text-white">
            <FontAwesomeIcon icon={faTowerObservation} className="text-lg" />
          </span>
          <div>
            <p className="text-lg font-extrabold text-ink-900 leading-none">מגדלור</p>
            <p className="text-xs text-ink-400 mt-1">סינון לידים · BST</p>
          </div>
        </div>
        <SidebarNav />
        <div className="mt-auto p-4 text-xs text-ink-400">
          התחדשות עירונית · פיתוח עסקי
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line">
          <div className="flex items-center justify-between gap-3 px-5 h-16">
            <div className="flex items-center gap-2.5 lg:hidden">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600 text-white">
                <FontAwesomeIcon icon={faTowerObservation} />
              </span>
              <span className="text-lg font-extrabold text-ink-900">מגדלור</span>
            </div>
            <div className="hidden lg:block" />
            <p className="text-sm text-ink-500 font-medium">{todayLabel()}</p>
          </div>
          <MobileNav />
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
