"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

export type RegionMetric = {
  code: string;
  name: string;
  value: number;
};

type RegionMapProps = {
  title?: string;
  geojsonUrl?: string;
  center?: [number, number];
  zoom?: number;
  metrics?: RegionMetric[];
  selectedCode?: string;
  onRegionClick?: (region: RegionMetric) => void;
};

export function RegionMap({
  geojsonUrl = "/geojson/gwangju.geojson",
  center = [126.95, 35.15],
  zoom = 9,
  metrics = [],
  selectedCode,
  onRegionClick,
}: RegionMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#f8fafc" } },
        ],
      },
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      const response = await fetch(geojsonUrl);
      const geojson = await response.json();
      const metricMap = new Map(metrics.map((metric) => [metric.code, metric]));
      const values = metrics.map((metric) => metric.value);
      const max = Math.max(...values, 1);

      geojson.features = geojson.features.map((feature: GeoJSON.Feature) => {
        const code = String(feature.properties?.code ?? "");
        const metric = metricMap.get(code);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            value: metric?.value ?? 0,
            intensity: (metric?.value ?? 0) / max,
          },
        };
      });

      map.addSource("regions", { type: "geojson", data: geojson });
      map.addLayer({
        id: "regions-fill",
        type: "fill",
        source: "regions",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0,
            "#dbeafe",
            0.5,
            "#38bdf8",
            1,
            "#1d4ed8",
          ],
          "fill-opacity": 0.78,
        },
      });
      map.addLayer({
        id: "regions-line",
        type: "line",
        source: "regions",
        paint: { "line-color": "#0f172a", "line-width": 1.2, "line-opacity": 0.45 },
      });
      map.addLayer({
        id: "regions-label",
        type: "symbol",
        source: "regions",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-font": ["sans-serif"],
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "regions-fill", (event) => {
        const feature = event.features?.[0];
        const code = String(feature?.properties?.code ?? "");
        const name = String(feature?.properties?.name ?? code);
        const value = Number(feature?.properties?.value ?? 0);
        onRegionClick?.({ code, name, value });
      });

      map.on("mouseenter", "regions-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "regions-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => map.remove();
  }, [center, geojsonUrl, metrics, onRegionClick, selectedCode, zoom]);

  return <div ref={ref} className="h-[500px] w-full rounded-md border" />;
}
