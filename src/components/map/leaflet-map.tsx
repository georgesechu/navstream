"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix Leaflet default icon paths (broken by Next.js bundling)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "",
  iconUrl: "",
  shadowUrl: "",
});

interface LeafletMapSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  type: string;
  activeAlerts: number;
}

interface LeafletMapDevice {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  batteryLevel?: number | null;
}

interface LeafletMapProps {
  sites: LeafletMapSite[];
  devices?: LeafletMapDevice[];
  onSiteClick?: (siteId: string) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  online: "#00e676",
  warning: "#ffab00",
  critical: "#ff1744",
  offline: "#5a6580",
};

const statusLabels: Record<string, string> = {
  online: "Online",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
};

function getMarkerRadius(alertCount: number): number {
  if (alertCount >= 5) return 12;
  if (alertCount >= 3) return 10;
  if (alertCount >= 1) return 9;
  return 7;
}

// Component to auto-fit bounds
function FitBounds({
  sites,
  devices,
}: {
  sites: LeafletMapSite[];
  devices?: LeafletMapDevice[];
}) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const points: L.LatLngExpression[] = [
      ...sites.map((s) => [s.lat, s.lng] as L.LatLngTuple),
      ...(devices || [])
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => [d.lat, d.lng] as L.LatLngTuple),
    ];
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      fitted.current = true;
    }
  }, [map, sites, devices]);

  return null;
}

// Diamond SVG marker for devices
function createDiamondIcon(color: string) {
  const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="10" height="10" rx="1" fill="${color}" stroke="#0a0e1a" stroke-width="1.5" transform="rotate(45 8 8)" />
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "leaflet-device-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

export function LeafletMap({
  sites,
  devices,
  onSiteClick,
  className,
}: LeafletMapProps) {
  // Compute center from sites
  const center = useMemo<L.LatLngTuple>(() => {
    if (sites.length === 0) return [20, 0];
    const avgLat = sites.reduce((a, s) => a + s.lat, 0) / sites.length;
    const avgLng = sites.reduce((a, s) => a + s.lng, 0) / sites.length;
    return [avgLat, avgLng];
  }, [sites]);

  return (
    <div
      data-testid="leaflet-map"
      className={cn("w-full h-full", className)}
    >
      <MapContainer
        center={center}
        zoom={3}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={true}
        style={{ background: "var(--nav-bg-primary)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds sites={sites} devices={devices} />

        {/* Site markers */}
        {sites.map((site) => {
          const color = statusColors[site.status] || statusColors.offline;
          const radius = getMarkerRadius(site.activeAlerts);
          const isActive = site.status !== "offline";

          return (
            <CircleMarker
              key={site.id}
              center={[site.lat, site.lng]}
              radius={radius}
              pathOptions={{
                color: "#0a0e1a",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
              className={isActive ? "leaflet-marker-pulsing" : ""}
              eventHandlers={{
                click: () => {
                  // popup opens automatically
                },
              }}
            >
              <Popup>
                <div className="leaflet-popup-dark">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color }}
                    >
                      {statusLabels[site.status] || "Unknown"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mb-1">{site.name}</p>
                  <p className="text-xs opacity-60 mb-1">{site.type}</p>
                  {site.activeAlerts > 0 && (
                    <p className="text-xs mb-2" style={{ color: statusColors.warning }}>
                      {site.activeAlerts} active alert
                      {site.activeAlerts > 1 ? "s" : ""}
                    </p>
                  )}
                  {onSiteClick && (
                    <button
                      data-testid={`leaflet-map-view-site-${site.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSiteClick(site.id);
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      style={{
                        background: "rgba(0, 229, 255, 0.15)",
                        color: "#00e5ff",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.background =
                          "rgba(0, 229, 255, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.background =
                          "rgba(0, 229, 255, 0.15)";
                      }}
                    >
                      View Site
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Device markers (diamond shape via DivIcon) */}
        {devices?.map((device) => {
          if (device.lat == null || device.lng == null) return null;
          const isOnline = device.status === "online";
          const color = isOnline ? "#00e5ff" : "#5a6580";

          return (
            <CircleMarker
              key={device.id}
              center={[device.lat, device.lng]}
              radius={5}
              pathOptions={{
                color: "#0a0e1a",
                weight: 1.5,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="leaflet-popup-dark">
                  <p className="text-sm font-semibold mb-1">{device.name}</p>
                  <p className="text-xs" style={{ color }}>
                    {isOnline ? "Online" : "Offline"}
                  </p>
                  {device.batteryLevel != null && (
                    <p className="text-xs opacity-60 mt-1">
                      Battery: {device.batteryLevel}%
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
