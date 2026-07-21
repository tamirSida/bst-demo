import "server-only";
import type { Lead } from "@/lib/domain/types";

/**
 * Resolve a lead's plot (מגרש) to WGS84 lat/lng for the map pin.
 *
 * Order: a value already cached on the lead (extra.geo) → live Nominatim geocode
 * by street+city (address-level, Hebrew) → a major-city centroid → Israel center.
 * Nominatim is rate-limited (1 req/s) and best-effort, so results are memoized
 * per process and every failure falls through to the centroid — the map always
 * renders a sensible pin, never an error.
 */
export interface LeadGeo {
  lat: number;
  lng: number;
  source: "cache" | "nominatim" | "city" | "country";
  /** True when the pin is only city-level (no exact address match). */
  approximate: boolean;
}

// Major Israeli city centroids (WGS84). Fallback when geocoding is unavailable.
const CITY_CENTROIDS: Record<string, [number, number]> = {
  "תל אביב": [32.0853, 34.7818],
  "תל אביב-יפו": [32.0853, 34.7818],
  "ירושלים": [31.7683, 35.2137],
  "חיפה": [32.794, 34.9896],
  "נתניה": [32.3215, 34.8532],
  "ראשון לציון": [31.973, 34.7925],
  "פתח תקווה": [32.084, 34.8878],
  "אשדוד": [31.8014, 34.6435],
  "באר שבע": [31.2518, 34.7913],
  "בת ים": [32.0171, 34.7457],
  "חולון": [32.0114, 34.7722],
  "רמת גן": [32.0684, 34.8248],
  "גבעתיים": [32.0722, 34.8127],
  "הרצליה": [32.1624, 34.8447],
  "כפר סבא": [32.1858, 34.9077],
  "רעננה": [32.1847, 34.8707],
  "אשקלון": [31.6688, 34.5715],
  "רחובות": [31.8928, 34.8113],
  "נס ציונה": [31.9293, 34.7986],
  "מודיעין": [31.8983, 35.0104],
  "לוד": [31.9514, 34.8955],
  "רמלה": [31.928, 34.8667],
  "נהריה": [33.0089, 35.0945],
  "עכו": [32.9281, 35.0818],
  "טבריה": [32.7959, 35.5308],
  "כרמיאל": [32.9157, 35.2955],
  "אילת": [29.5577, 34.9519],
  "קריית גת": [31.61, 34.7642],
  "יבנה": [31.8781, 34.7392],
  "הוד השרון": [32.15, 34.8892],
  "ראש העין": [32.0956, 34.9564],
};
const ISRAEL_CENTER: [number, number] = [31.8, 34.9];

const memo = new Map<string, LeadGeo>();

export async function geocodeLead(lead: Lead): Promise<LeadGeo> {
  const cached = (lead.extra?.geo as { lat?: number; lng?: number } | undefined) ?? undefined;
  if (cached?.lat != null && cached?.lng != null) {
    return { lat: cached.lat, lng: cached.lng, source: "cache", approximate: false };
  }

  const key = [lead.address, lead.city].filter(Boolean).join(", ") || lead.city || lead.id;
  const hit = memo.get(key);
  if (hit) return hit;

  let result: LeadGeo | null = null;
  if (lead.address && lead.city) {
    result = await geocodeNominatim(lead.address, lead.city).catch(() => null);
  }
  if (!result && lead.city && CITY_CENTROIDS[lead.city]) {
    const [lat, lng] = CITY_CENTROIDS[lead.city];
    result = { lat, lng, source: "city", approximate: true };
  }
  if (!result) {
    result = { lat: ISRAEL_CENTER[0], lng: ISRAEL_CENTER[1], source: "country", approximate: true };
  }

  memo.set(key, result);
  return result;
}

async function geocodeNominatim(street: string, city: string): Promise<LeadGeo | null> {
  const params = new URLSearchParams({
    street,
    city,
    country: "Israel",
    format: "jsonv2",
    "accept-language": "he",
    limit: "1",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "BST-Leads/1.0 (bst@tippingpoint.portfolio-plus.com)" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = arr?.[0];
    if (!first) return null;
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      source: "nominatim",
      approximate: false,
    };
  } finally {
    clearTimeout(timer);
  }
}
