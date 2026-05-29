"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { interpolateBlues, interpolateRdYlGn } from "d3-scale-chromatic";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapMetric } from "@/components/domain/map-controls";
import { cn } from "@/lib/utils/cn";

export type RegionMetric = {
  code: string;
  name: string;
  value: number;
  articleCount: number;
  averageScore: number;
  sentiment: number;
  diversity: number;
  topAgenda?: string;
};

type RegionMapProps = {
  title: string;
  geojsonUrl: string;
  center: [number, number];
  zoom: number;
  metric: MapMetric;
  metrics: RegionMetric[];
  selectedCode?: string;
  onRegionClick: (region: RegionMetric) => void;
};

type TooltipState = {
  x: number;
  y: number;
  name: string;
  value: number;
  articleCount: number;
};

export function RegionMap({
  title,
  geojsonUrl,
  center,
  zoom,
  metric,
  metrics,
  selectedCode,
  onRegionClick,
}: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const metricMap = useMemo(() => new Map(metrics.map((item) => [item.code, item])), [metrics]);
  const maxValue = useMemo(() => Math.max(1, ...metrics.map((item) => item.value)), [metrics]);

  const applyData = useCallback(() => {
    const map = mapRef.current;
    const source = map?.getSource("regions") as GeoJSONSource | undefined;
    const geojson = geojsonRef.current;
    if (!map || !source || !geojson) return;

    const nextData: GeoJSON.FeatureCollection = {
      ...geojson,
      features: geojson.features.map((feature) => {
        const code = String(feature.properties?.code ?? feature.properties?.name ?? "");
        const name = String(feature.properties?.name ?? code);
        const regionMetric =
          metricMap.get(code) ?? metricMap.get(name) ?? createEmptyMetric(code || name, name);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            code,
            name,
            value: regionMetric.value,
            articleCount: regionMetric.articleCount,
            selected: selectedCode === code,
          },
        };
      }),
    };
    source.setData(nextData);
  }, [metricMap, selectedCode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = resolvedTheme === "dark";
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeBaseStyle(isDark),
      center,
      zoom,
      attributionControl: false,
      doubleClickZoom: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", async () => {
      const response = await fetch(geojsonUrl);
      geojsonRef.current = await response.json();
      map.addSource("regions", { type: "geojson", data: geojsonRef.current ?? emptyGeoJson });
      map.addLayer({
        id: "regions-fill",
        type: "fill",
        source: "regions",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#f97316",
            [
              "interpolate",
              ["linear"],
              ["get", "value"],
              0,
              colorForMetric(metric, 0),
              maxValue * 0.5,
              colorForMetric(metric, 0.55),
              maxValue,
              colorForMetric(metric, 1),
            ],
          ],
          "fill-opacity": 0.82,
        },
      });
      map.addLayer({
        id: "regions-line",
        type: "line",
        source: "regions",
        paint: {
          "line-color": isDark ? "#e5e7eb" : "#0f172a",
          "line-width": ["case", ["boolean", ["get", "selected"], false], 2.5, 1.1],
          "line-opacity": 0.75,
        },
      });
      map.addLayer({
        id: "regions-label",
        type: "symbol",
        source: "regions",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": isDark ? "#f8fafc" : "#0f172a",
          "text-halo-color": isDark ? "#020617" : "#ffffff",
          "text-halo-width": 1.2,
        },
      });

      map.on("mousemove", "regions-fill", (event) => {
        const feature = event.features?.[0];
        const code = String(feature?.properties?.code ?? "");
        const name = String(feature?.properties?.name ?? code);
        const regionMetric = metricMap.get(code) ?? metricMap.get(name);
        map.getCanvas().style.cursor = "pointer";
        setTooltip({
          x: event.point.x,
          y: event.point.y,
          name,
          value: Number(feature?.properties?.value ?? regionMetric?.value ?? 0),
          articleCount: Number(
            feature?.properties?.articleCount ?? regionMetric?.articleCount ?? 0,
          ),
        });
      });

      map.on("mouseleave", "regions-fill", () => {
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });

      map.on("click", "regions-fill", (event) => {
        const feature = event.features?.[0];
        const code = String(feature?.properties?.code ?? "");
        const name = String(feature?.properties?.name ?? code);
        const regionMetric =
          metricMap.get(code) ?? metricMap.get(name) ?? createEmptyMetric(code, name);
        onRegionClick(regionMetric);
      });

      applyData();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      geojsonRef.current = null;
    };
  }, [
    applyData,
    center,
    geojsonUrl,
    maxValue,
    metric,
    metricMap,
    onRegionClick,
    resolvedTheme,
    zoom,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.setPaintProperty("regions-fill", "fill-color", [
      "case",
      ["boolean", ["get", "selected"], false],
      "#f97316",
      [
        "interpolate",
        ["linear"],
        ["get", "value"],
        0,
        colorForMetric(metric, 0),
        maxValue * 0.5,
        colorForMetric(metric, 0.55),
        maxValue,
        colorForMetric(metric, 1),
      ],
    ]);
    applyData();
  }, [applyData, maxValue, metric, selectedCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new ResizeObserver(() => map.resize());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-md border bg-muted">
      <div ref={containerRef} aria-label={`${title} 행정구역 지도`} className="h-[460px] w-full" />
      {tooltip ? (
        <div
          className={cn(
            "pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-md",
          )}
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <p className="font-semibold">{tooltip.name}</p>
          <p className="text-muted-foreground">측정값: {formatMetric(metric, tooltip.value)}</p>
          <p className="text-muted-foreground">
            기사 수: {tooltip.articleCount.toLocaleString()}건
          </p>
        </div>
      ) : null}
    </div>
  );
}

function makeBaseStyle(isDark: boolean): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": isDark ? "#020617" : "#f8fafc" },
      },
    ],
  };
}

const emptyGeoJson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function colorForMetric(metric: MapMetric, value: number) {
  if (metric === "sentiment") return interpolateRdYlGn(value);
  return interpolateBlues(value);
}

function createEmptyMetric(code: string, name: string): RegionMetric {
  return {
    code,
    name,
    value: 0,
    articleCount: 0,
    averageScore: 0,
    sentiment: 0,
    diversity: 0,
  };
}

function formatMetric(metric: MapMetric, value: number) {
  if (metric === "sentiment") return value.toFixed(2);
  if (metric === "diversity") return value.toFixed(1);
  return `${Math.round(value).toLocaleString()}건`;
}
