"use client";

import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";

import { EChart } from "@/components/charts/echart";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { SwitchRow } from "@/components/domain/trends/SwitchRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsLifecycle, useTopicArticles, useTopics } from "@/lib/hooks/use-api";
import { lastNDates } from "@/lib/utils/visualization";

export function LifecycleTab() {
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const topics = useTopics("30d");
  const activeId = selectedTopicIds[0] ?? topics.data?.data?.[0]?.id;
  const activeTopic = topics.data?.data?.find((topic) => topic.id === activeId);
  const lifecycle = useAnalyticsLifecycle(activeId);
  const topicArticles = useTopicArticles(activeId);
  const option = useMemo(() => makeLifecycleOption(lifecycle.data?.data), [lifecycle.data?.data]);

  function selectTopic(id: number) {
    setSelectedTopicIds((previous) => {
      if (!compareMode) return [id];
      if (previous.includes(id)) return previous.filter((item) => item !== id);
      return [...previous, id].slice(0, 3);
    });
  }

  return (
    <ChartCard
      title="이슈 라이프사이클"
      description="토픽의 부상, 정점, 소멸 흐름을 면적 차트로 확인합니다."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={String(activeId ?? "")}
          onValueChange={(value) => selectTopic(Number(value))}
        >
          <SelectTrigger className="w-80 max-w-full">
            <SelectValue placeholder="토픽 선택" />
          </SelectTrigger>
          <SelectContent>
            {(topics.data?.data ?? []).map((topic) => (
              <SelectItem key={topic.id} value={String(topic.id)}>
                {topic.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SwitchRow label="비교 모드" checked={compareMode} onChange={setCompareMode} />
        <RelatedContentDialog
          title={`${activeTopic?.label ?? "선택 토픽"} 관련 기사`}
          description="선택한 토픽의 주요 기사를 현재 화면에서 확인합니다."
          articles={topicArticles.data?.data}
          query={activeTopic ? { q: activeTopic.keywords[0], limit: 30, offset: 0 } : undefined}
          trigger={
            <Button type="button" variant="outline" disabled={!activeId}>
              관련 내용 보기
            </Button>
          }
        />
        {selectedTopicIds.map((id) => (
          <Badge key={id} variant="outline">
            Topic {id}
          </Badge>
        ))}
      </div>
      {lifecycle.isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : (
        <EChart option={option} height={500} ariaLabel="이슈 라이프사이클 면적 차트" />
      )}
      <LifecycleStats values={lifecycle.data?.data?.series.map((point) => point.value) ?? []} />
    </ChartCard>
  );
}

function makeLifecycleOption(lifecycle?: {
  label: string;
  series: Array<{ date: string; value: number }>;
  stages: Array<{ date: string; stage: string; value: number }>;
}): EChartsOption {
  const dates = lifecycle?.series.map((point) => point.date) ?? lastNDates(30);
  const values =
    lifecycle?.series.map((point) => point.value) ??
    dates.map((_, index) => Math.max(0, Math.round(Math.sin(index / 4) * 8 + index / 2 + 8)));
  const peak = Math.max(...values);
  const peakIndex = values.indexOf(peak);

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: { trigger: "axis" },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" } } },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value", name: "기사 수" },
    visualMap: {
      show: false,
      dimension: 0,
      pieces: [
        { lte: Math.floor(dates.length * 0.33), color: "#f59e0b" },
        {
          gt: Math.floor(dates.length * 0.33),
          lte: Math.floor(dates.length * 0.66),
          color: "#ef4444",
        },
        { gt: Math.floor(dates.length * 0.66), color: "#94a3b8" },
      ],
    },
    series: [
      {
        name: lifecycle?.label ?? "선택 토픽",
        type: "line",
        smooth: true,
        areaStyle: {},
        data: values,
        markPoint: {
          data: [
            {
              name: "부상",
              coord: [
                dates[Math.floor(dates.length * 0.18)],
                values[Math.floor(dates.length * 0.18)],
              ],
              symbol: "pin",
            },
            { name: "정점", coord: [dates[peakIndex], peak], symbol: "star" },
            {
              name: "소멸",
              coord: [
                dates[Math.floor(dates.length * 0.82)],
                values[Math.floor(dates.length * 0.82)],
              ],
              symbol: "pin",
            },
          ],
        },
      },
    ],
  };
}

function LifecycleStats({ values }: { values: number[] }) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...values, 0);
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <Stat label="부상기간" value="초기 1/3 구간" />
      <Stat label="정점 기사 수" value={`${peak}건`} />
      <Stat label="누적 기사 수" value={`${total}건`} />
      <Stat label="평균 감성" value="0.12" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
