"use client";

import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import { useState } from "react";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCsv } from "@/lib/utils/visualization";
import type { AnalyticsRegionMatrix } from "@/types/api";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type SelectedCell = { region: string; agenda: string } | undefined;

export function RegionAgendaHeatmap({
  matrix,
  loading,
}: {
  matrix?: AnalyticsRegionMatrix;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<SelectedCell>();
  const option = matrix ? makeMatrixOption(matrix) : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>지역×영역 히트맵</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={!matrix}
          onClick={() => {
            if (!matrix) return;
            downloadCsv(
              "region-agenda-matrix.csv",
              matrix.rows.flatMap((row, rowIndex) =>
                matrix.cols.map((col, colIndex) => ({
                  region: row,
                  agenda: col,
                  value: matrix.values[rowIndex]?.[colIndex] ?? 0,
                })),
              ),
            );
          }}
        >
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading || !matrix || !option ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <ReactECharts
            option={option}
            style={{ height: 560, width: "100%" }}
            onEvents={{
              click: (params: { value?: [number, number, number] }) => {
                if (!params.value) return;
                const [colIndex, rowIndex] = params.value;
                setSelected({ region: matrix.rows[rowIndex], agenda: matrix.cols[colIndex] });
              },
            }}
          />
        )}
        <RelatedContentDialog
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(undefined);
          }}
          title={selected ? `${selected.region} · ${selected.agenda}` : "관련 내용"}
          description="히트맵 셀에 해당하는 관련 기사와 상세 내용을 현재 화면에서 확인합니다."
          query={{ region: selected?.region, agenda: selected?.agenda, limit: 30, offset: 0 }}
        />
      </CardContent>
    </Card>
  );
}

function makeMatrixOption(matrix: AnalyticsRegionMatrix): EChartsOption {
  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      position: "top",
      formatter: (params) => {
        const value = (params as { value?: [number, number, number] }).value;
        if (!value) return "";
        return `${matrix.rows[value[1]]} / ${matrix.cols[value[0]]}<br/>기사 수 ${value[2]}`;
      },
    },
    toolbox: { feature: { saveAsImage: { title: "PNG 저장" } }, right: 8 },
    grid: { left: 92, right: 24, top: 48, bottom: 88 },
    xAxis: { type: "category", data: matrix.cols, axisLabel: { rotate: 35 } },
    yAxis: { type: "category", data: matrix.rows },
    visualMap: {
      min: 0,
      max: Math.max(1, ...matrix.values.flat()),
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#eff6ff", "#60a5fa", "#1d4ed8"] },
    },
    series: [
      {
        type: "heatmap",
        data: matrix.values.flatMap((rowValues, rowIndex) =>
          rowValues.map((value, colIndex) => [colIndex, rowIndex, value]),
        ),
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.25)" } },
      },
    ],
  };
}
