"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Chip } from "@/components/ui/Chip";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Field";
import { DEAL_TYPE_LABEL, DealType } from "@/lib/domain/enums";
import { cn } from "@/lib/cn";

/**
 * Filter bar for the Leads table. All state lives in the URL searchParams so the
 * page (server) reads it and filters via the repo — shareable, back-button safe.
 */
export function PipelineFilters({ cities }: { cities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dealType = params.get("dealType") ?? "";
  const city = params.get("city") ?? "";
  // Default ON: activeOnly is enabled unless explicitly "0".
  const activeOnly = params.get("active") !== "0";

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const dealTypes = Object.values(DealType);

  return (
    <div className="space-y-3">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ search });
        }}
        className="relative"
      >
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute top-1/2 -translate-y-1/2 start-3.5 text-ink-400"
        />
        <input
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => update({ search: v }), 350);
          }}
          onBlur={() => update({ search })}
          placeholder="חיפוש לפי פרויקט, עיר, כתובת או איש קשר…"
          className={cn(
            "w-full h-12 rounded-lg bg-surface border border-line ps-11 pe-4 text-ink-900",
            "placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
          )}
        />
      </form>

      {/* Deal-type chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip selected={dealType === ""} onClick={() => update({ dealType: null })}>
          הכל
        </Chip>
        {dealTypes.map((dt) => (
          <Chip key={dt} selected={dealType === dt} onClick={() => update({ dealType: dt })}>
            {DEAL_TYPE_LABEL[dt]}
          </Chip>
        ))}
      </div>

      {/* City + active toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={city}
          onChange={(e) => update({ city: e.target.value })}
          className="w-auto min-w-44"
        >
          <option value="">כל הערים</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Toggle
          checked={activeOnly}
          onChange={(next) => update({ active: next ? null : "0" })}
          labelOn="פעילים בלבד"
          labelOff="כולל ארכיון"
        />
      </div>
    </div>
  );
}
