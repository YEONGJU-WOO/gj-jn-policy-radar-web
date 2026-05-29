"use client";

import type { EChartsOption } from "echarts";
import "echarts-wordcloud";

import { EChart } from "@/components/charts/echart";

export type WordCloudWord = {
  name: string;
  value: number;
  group?: string;
};

export function WordCloud({
  words,
  height = 460,
  onClick,
}: {
  words: WordCloudWord[];
  height?: number;
  onClick?: (word: string) => void;
}) {
  const option: EChartsOption = {
    tooltip: { show: true },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" } } },
    series: [
      {
        type: "wordCloud",
        shape: "circle",
        gridSize: 10,
        sizeRange: [13, 54],
        rotationRange: [0, 0],
        textStyle: {
          fontFamily: "Pretendard, NanumGothic, sans-serif",
          color: (params: { dataIndex?: number }) => {
            const palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
            return palette[(params.dataIndex ?? 0) % palette.length];
          },
        },
        emphasis: { focus: "self" },
        data: words,
      },
    ],
  } as EChartsOption;

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel="키워드 워드클라우드"
      onEvents={{ click: (params) => onClick?.((params as { name?: string }).name ?? "") }}
    />
  );
}
