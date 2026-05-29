"use client";

import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export type EChartProps = {
  option: EChartsOption;
  height?: number;
  onEvents?: Record<string, (params: unknown) => void>;
  ariaLabel?: string;
};

export function EChart({ option, height = 320, onEvents, ariaLabel }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} role="img" aria-label={ariaLabel ?? "데이터 시각화 차트"}>
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        notMerge
        lazyUpdate
        onEvents={onEvents}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
