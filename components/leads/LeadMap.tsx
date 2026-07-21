"use client";

import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faLocationDot,
  faMap,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { buildGovmapUrl } from "@/lib/leads/govmap";

/**
 * Plot (מגרש) map card for the lead detail sidebar: an OpenStreetMap pin at the
 * lead's address, the plot's גוש/חלקה, and a "הפק נסח טאבו" button that opens the
 * official Ministry of Justice extract service (where the נסח is actually
 * produced). A secondary link opens govmap to view the plot.
 *
 * The Leaflet map itself is loaded client-only (ssr:false) — allowed here because
 * this is a Client Component.
 */
const MapInner = dynamic(() => import("./LeadMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-sm text-ink-400">
      טוען מפה…
    </div>
  ),
});

export function LeadMap({
  leadId,
  lat,
  lng,
  label,
  address,
  approximate,
  gushHelka,
}: {
  leadId: string;
  lat: number;
  lng: number;
  label: string;
  address: string | null;
  approximate: boolean;
  gushHelka: string[];
}) {
  const govmapUrl = buildGovmapUrl(lat, lng);
  const gushHelkaText = gushHelka.filter(Boolean).join(" · ");

  return (
    <div className="space-y-3">
      <div className="h-[240px] w-full overflow-hidden rounded-lg border border-line">
        <MapInner lat={lat} lng={lng} label={label} />
      </div>

      <div className="flex items-start gap-1.5 text-xs text-ink-500">
        <FontAwesomeIcon icon={faLocationDot} className="mt-0.5 text-ink-400" />
        <span>
          {address || label}
          {approximate && <span className="text-ink-400"> · מיקום מקורב לפי העיר</span>}
        </span>
      </div>

      {gushHelkaText && (
        <p className="text-xs text-ink-500">
          <span className="text-ink-400">גוש/חלקה: </span>
          {gushHelkaText}
        </p>
      )}

      <a
        href={`/tabu/${leadId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        <FontAwesomeIcon icon={faFileLines} />
        הפק נסח טאבו
        <FontAwesomeIcon icon={faUpRightFromSquare} className="text-[0.75em] opacity-70" />
      </a>

      <a
        href={govmapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-600 transition-colors hover:bg-surface-muted"
      >
        <FontAwesomeIcon icon={faMap} className="text-ink-400" />
        צפה בגוש/חלקה במפת ממשל (govmap)
        <FontAwesomeIcon icon={faUpRightFromSquare} className="text-[0.7em] opacity-60" />
      </a>
    </div>
  );
}
