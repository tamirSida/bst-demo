"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * The actual Leaflet map. Imported dynamically with ssr:false (Leaflet touches
 * `window`), so this file only ever runs in the browser. A pure SVG divIcon is
 * used for the pin — no external marker-image files, so nothing to break under
 * the bundler.
 */

const PIN = L.divIcon({
  className: "",
  html: `<svg width="30" height="40" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="#454a3f"/>
    <circle cx="12" cy="12" r="4.5" fill="#ededE4"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -36],
});

export default function LeadMapInner({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Marker position={[lat, lng]} icon={PIN}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
