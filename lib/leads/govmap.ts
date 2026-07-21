import proj4 from "proj4";

/**
 * Link-out helpers to the Israeli government map (govmap.gov.il) — where a plot's
 * gush/helka (גוש/חלקה) is looked up on the way to producing a נסח טאבו.
 *
 * govmap centers on a coordinate given in the Israeli TM grid (EPSG:2039), NOT
 * WGS84 lat/lng, so we reproject with proj4 before building the URL.
 */

/**
 * The official Ministry of Justice "מקרקעין ברשת" service that actually produces
 * (מפיק) a נסח טאבו — a full land-registry extract — from a plot's גוש/חלקה.
 * This is the authorized issuing channel; govmap (below) only *views* the plot.
 */
export const TABU_EXTRACT_URL =
  "https://mekarkein-online.justice.gov.il/voucher/request/regular";

// EPSG:2039 — Israel 1993 / Israeli TM Grid.
proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 " +
    "+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 " +
    "+towgs84=-24.0024,-17.1032,-17.8444,-0.33077,-1.85269,1.66969,5.4262 +units=m +no_defs",
);

/** Build a govmap URL centered on the given WGS84 coordinate. */
export function buildGovmapUrl(lat: number, lng: number, zoom = 10): string {
  // proj4 takes [x=lng, y=lat] and returns [x, y] in ITM metres.
  const [x, y] = proj4("EPSG:4326", "EPSG:2039", [lng, lat]);
  return `https://www.govmap.gov.il/?z=${zoom}&c=${x.toFixed(2)},${y.toFixed(2)}&b=0`;
}
