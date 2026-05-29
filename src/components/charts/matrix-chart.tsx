"use client";

import { EChart } from "@/components/charts/echart";
import type { AnalyticsRegionMatrix } from "@/types/api";

export function MatrixChart({ data }: { data: AnalyticsRegionMatrix }) {
  return (
    <EChart
      option={{
        tooltip: { position: "top" },
        xAxis: { type: "category", data: data.cols },
        yAxis: { type: "category", data: data.rows },
        visualMap: {
          min: 0,
          max: Math.max(1, ...data.values.flat()),
          orient: "horizontal",
        },
        series: [
          {
            type: "heatmap",
            data: data.values.flatMap((rowValues, rowIndex) =>
              rowValues.map((value, colIndex) => [colIndex, rowIndex, value]),
            ),
            label: { show: true },
          },
        ],
      }}
    />
  );
}
