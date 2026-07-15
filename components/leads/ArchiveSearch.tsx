"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

/** One big search box for the archive, wired to the ?search= param. */
export function ArchiveSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(params.get("search") ?? "");

  const commit = (q: string) => {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("search", q.trim());
    else next.delete("search");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit(value);
      }}
      className="relative"
    >
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="absolute top-1/2 -translate-y-1/2 start-4 text-ink-400 text-lg"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => commit(value)}
        placeholder="חיפוש בזיכרון המוסדי — פרויקט, עיר, כתובת או איש קשר…"
        className={cn(
          "w-full h-14 rounded-xl bg-surface border border-line ps-12 pe-4 text-lg text-ink-900 shadow-card",
          "placeholder:text-ink-400 placeholder:text-base focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
        )}
      />
    </form>
  );
}
