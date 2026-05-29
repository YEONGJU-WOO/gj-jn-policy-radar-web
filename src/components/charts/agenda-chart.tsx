"use client";

import { EChart } from "@/components/charts/echart";

export function AgendaChart({ data }: { data: Array<{ agenda: string; count: number }> }) {
  return (
    <EChart
      option={{
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: ["42%", "70%"],
            data: data.map((item) => ({ name: item.agenda, value: item.count })),
          },
        ],
      }}
    />
  );
}
