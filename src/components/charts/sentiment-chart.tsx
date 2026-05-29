"use client";

import { EChart } from "@/components/charts/echart";
import type { SeriesPoint } from "@/types/api";

export function SentimentChart({ data }: { data: Record<string, SeriesPoint[]> }) {
  const dates = Array.from(
    new Set(Object.values(data).flatMap((series) => series.map((p) => p.date))),
  ).sort();
  return (
    <EChart
      option={{
        tooltip: { trigger: "axis" },
        legend: { top: 0 },
        xAxis: { type: "category", data: dates },
        yAxis: { type: "value" },
        series: Object.entries(data).map(([name, series]) => ({
          name,
          type: "line",
          smooth: true,
          data: dates.map((date) => series.find((point) => point.date === date)?.value ?? 0),
        })),
      }}
    />
  );
}
