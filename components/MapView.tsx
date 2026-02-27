"use client";

import { useEffect, useMemo, useState } from "react";
import { Issue } from "@/lib/types";
import dynamic from "next/dynamic";

// Import Leaflet CSS
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
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface MapViewProps {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function MapView({
  issues,
  center = [40.7128, -74.006],
  zoom = 12,
  className = "",
}: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  const validIssues = useMemo(
    () =>
      issues.filter(
        (issue) => Number.isFinite(Number(issue.latitude)) && Number.isFinite(Number(issue.longitude))
      ),
    [issues]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (validIssues.length === 0) return center;
    return [Number(validIssues[0].latitude), Number(validIssues[0].longitude)];
  }, [center, validIssues]);

  const mapZoom = validIssues.length > 0 ? 15 : zoom;

  useEffect(() => {
    setIsMounted(true);
    
    // Import Leaflet CSS dynamically
    if (typeof window !== "undefined") {
      import("leaflet/dist/leaflet.css");
      import("leaflet").then((L) => {
        type IconDefaultWithGetIcon = typeof L.Icon.Default.prototype & {
          _getIconUrl?: string;
        };

        // Fix marker icon issue
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
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validIssues.map((issue) => (
          <Marker key={issue.id} position={[Number(issue.latitude), Number(issue.longitude)]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{issue.title}</h3>
                <p className="text-sm text-gray-600">{issue.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: <span className="capitalize">{issue.status}</span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

