"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { Toggle } from "./Toggle";

/*
 * No 10s option any more. Each refresh re-renders the whole server tree and, in
 * production, re-arms link prefetching for every visible row — at 10s that is a
 * standing load on Firestore for a list that changes a few times a day. A
 * minute is plenty, and the explicit "refresh now" button covers the moments
 * when someone wants it immediately. Stored prefs of 10 or 30 fall back to the
 * default automatically, since they're no longer in OPTIONS.
 */
const OPTIONS = [60, 300] as const;
const STORAGE_KEY = "bst.autoRefresh";
const DEFAULT: Prefs = { enabled: true, seconds: 60 };

interface Prefs {
  enabled: boolean;
  seconds: number;
}

/*
 * Persisted prefs live in a tiny external store read via useSyncExternalStore.
 * That renders the defaults on the server and swaps in the stored value on
 * hydration with no flash — and without a setState-in-effect hydrate.
 */
const listeners = new Set<() => void>();
let cache: Prefs | null = null;
let cacheStr: string | null = null;
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT);

function readPrefs(): Prefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    const seconds = OPTIONS.includes(p.seconds as (typeof OPTIONS)[number])
      ? (p.seconds as number)
      : DEFAULT.seconds;
    const enabled = typeof p.enabled === "boolean" ? p.enabled : DEFAULT.enabled;
    cache = { enabled, seconds };
  } catch {
    cache = DEFAULT;
  }
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  if (cacheStr === null) cacheStr = JSON.stringify(readPrefs());
  return cacheStr;
}

function writePrefs(next: Prefs): void {
  cache = next;
  cacheStr = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, cacheStr);
  } catch {
    /* private mode / quota — preference just won't persist */
  }
  listeners.forEach((l) => l());
}

/**
 * Soft auto-refresh for a server-rendered list. Calls router.refresh() on an
 * interval so new inbound leads appear without a manual reload — pausing while
 * the tab is hidden and catching up the moment it becomes visible again. The
 * choice (on/off + interval) is remembered in the browser.
 */
export function AutoRefresh() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT);
  const { enabled, seconds } = JSON.parse(snapshot) as Prefs;
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 600);
  }, [router]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, seconds, refresh]);

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-line bg-surface h-11 ps-2 pe-4">
      <button
        type="button"
        onClick={refresh}
        title="רענון עכשיו"
        className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm text-ink-700 transition-colors hover:bg-surface-muted hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <FontAwesomeIcon icon={faRotate} spin={spinning} className="text-sm text-ink-400" />
        רענן עכשיו
      </button>
      <span aria-hidden className="h-5 w-px bg-line" />
      <Toggle
        checked={enabled}
        onChange={(v) => writePrefs({ enabled: v, seconds })}
        labelOn="רענון אוטומטי"
        labelOff="רענון אוטומטי"
      />
      {enabled && (
        <select
          value={seconds}
          onChange={(e) => writePrefs({ enabled, seconds: Number(e.target.value) })}
          aria-label="תדירות רענון"
          className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <option value={60}>כל דקה</option>
          <option value={300}>כל 5 דקות</option>
        </select>
      )}
    </div>
  );
}
