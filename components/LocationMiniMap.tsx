"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
interface LocationMiniMapProps {
  center: [number, number] | null;
  className?: string;
}

function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, 16);
  }, [center, map]);

  return null;
}

export function LocationMiniMap({ center, className = "" }: LocationMiniMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      import("leaflet/dist/leaflet.css");
      import("leaflet").then((L) => {
        type IconDefaultWithGetIcon = typeof L.Icon.Default.prototype & {
          _getIconUrl?: string;
        };
        const defaultIcon = L.Icon.Default.prototype as IconDefaultWithGetIcon;
        delete defaultIcon._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      });
    }
  }, []);

  if (!isMounted) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center text-sm text-slate-500 ${className}`}>
        Loading map...
      </div>
    );
  }

  const fallbackCenter: [number, number] = [20, 0];
  const mapCenter = center ?? fallbackCenter;

  return (
    <div className={className}>
      <MapContainer
        center={mapCenter}
        zoom={center ? 16 : 2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <MapRecenter center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && <Marker position={center} />}
      </MapContainer>
    </div>
  );
}
