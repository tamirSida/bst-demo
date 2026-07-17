"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxArchive,
  faGear,
  faHouse,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

const ITEMS: { href: string; label: string; icon: IconDefinition }[] = [
  { href: "/today", label: "היום", icon: faHouse },
  { href: "/leads", label: "לידים", icon: faLayerGroup },
  { href: "/archive", label: "ארכיון", icon: faBoxArchive },
  { href: "/settings", label: "הגדרות", icon: faGear },
];

/** Right-hand RTL nav. Highlights the active section. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 h-11 font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-cream/50",
              active
                ? "bg-logo-cream text-brand-700"
                : "text-logo-cream/70 hover:bg-brand-500 hover:text-logo-cream",
            )}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={cn("text-lg w-5", active ? "text-brand-600" : "text-logo-cream/50")}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Compact horizontal nav for mobile (shown under the top bar). */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden flex items-center gap-1 overflow-x-auto px-3 py-2 bg-surface border-b border-line">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 h-9 text-sm font-semibold whitespace-nowrap",
              active ? "bg-brand-600 text-white" : "text-ink-700 bg-surface-muted",
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="text-sm" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
