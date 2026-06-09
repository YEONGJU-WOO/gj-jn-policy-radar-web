"use client";

import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";

import { EChart } from "@/components/charts/echart";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { TOPIC_PERIODS } from "@/components/domain/trends/constants";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsLifecycle, useTopicArticles, useTopics } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword } from "@/lib/utils/korean-stopwords";
import { lastNDates } from "@/lib/utils/visualization";
import type { ApiPeriod, TopicLifecycle } from "@/types/api";

export function LifecycleTab() {
  const [period, setPeriod] = useState<ApiPeriod>("14d");
  const [query, setQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const topics = useTopics(period);

  const topicOptions = useMemo(() => {
    const rows = topics.data?.data ?? [];
    return rows
      .filter((topic) => topic.article_count >= 3)
      .filter(
        (topic) =>
          isMeaningfulKoreanKeyword(topic.label) ||
          topic.keywords.some((keyword) => isMeaningfulKoreanKeyword(keyword)),
      )
      .filter((topic) => {
        const keyword = query.trim();
        if (!keyword) return true;
        return (
          topic.label.includes(keyword) || topic.keywords.some((term) => term.includes(keyword))
        );
      })
      .slice(0, 80);
  }, [query, topics.data?.data]);

  const activeId = selectedTopicId ?? topicOptions[0]?.id;
  const activeTopic = topicOptions.find((topic) => topic.id === activeId);
  const lifecycle = useAnalyticsLifecycle(activeId);
  const topicArticles = useTopicArticles(activeId);
  const lifecycleData = lifecycle.data?.data;
  const option = useMemo(() => makeLifecycleOption(lifecycleData), [lifecycleData]);
  const stats = useMemo(() => summarizeLifecycle(lifecycleData), [lifecycleData]);

  return (
    <ChartCard
      title="이슈 라이프사이클"
      description="토픽별 기사 수 변화를 선 그래프로 보여줍니다. 부상, 정점, 소멸 구간을 색으로 구분해 흐름을 읽기 쉽게 만들었습니다."
    >
      <div className="mb-4 grid gap-3 xl:grid-cols-[180px_280px_1fr_auto]">
        <PeriodSelect value={period} onChange={setPeriod} periods={TOPIC_PERIODS} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="토픽 검색"
          aria-label="토픽 검색"
        />
        <Select
          value={String(activeId ?? "")}
          onValueChange={(value) => setSelectedTopicId(Number(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="토픽 선택" />
          </SelectTrigger>
          <SelectContent>
            {topicOptions.map((topic) => (
              <SelectItem key={topic.id} value={String(topic.id)}>
                {topic.label} · {topic.article_count}건
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RelatedContentDialog
          title={`${activeTopic?.label ?? "선택 토픽"} 관련 기사`}
          description="선택한 토픽의 주요 기사와 요약을 현재 화면에서 확인합니다."
          articles={topicArticles.data?.data}
          query={
            activeTopic
              ? { q: activeTopic.keywords[0] ?? activeTopic.label, limit: 30, offset: 0 }
              : undefined
          }
          trigger={
            <Button type="button" variant="outline" disabled={!activeId}>
              관련 내용 보기
            </Button>
          }
        />
      </div>

      {activeTopic ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {activeTopic.keywords.slice(0, 8).map((keyword) => (
            <Badge key={keyword} variant="outline">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}

      {topics.isLoading || lifecycle.isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : activeId && lifecycleData?.series?.length ? (
        <EChart option={option} height={500} ariaLabel="이슈 라이프사이클 선 차트" />
      ) : (
        <LifecycleEmptyState period={period} />
      )}

      <LifecycleStats stats={stats} />
      <LifecycleTimeline lifecycle={lifecycleData} />
    </ChartCard>
  );
}

function makeLifecycleOption(lifecycle?: TopicLifecycle): EChartsOption {
  const dates = lifecycle?.series.map((point) => point.date) ?? lastNDates(14);
  const values = lifecycle?.series.map((point) => point.value) ?? dates.map(() => 0);
  const stageByDate = new Map((lifecycle?.stages ?? []).map((stage) => [stage.date, stage.stage]));
  const peak = Math.max(...values, 0);
  const peakIndex = values.indexOf(peak);
  const latestValue = values.at(-1) ?? 0;

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const date = String((item as { axisValue?: string }).axisValue ?? "");
        const value = Number((item as { data?: number }).data ?? 0);
        return `${date}<br/>기사 ${value}건<br/>단계 ${normalizeStage(stageByDate.get(date))}`;
      },
    },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" } } },
    grid: { left: 48, right: 28, top: 36, bottom: 38 },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value", name: "기사 수" },
    visualMap: {
      show: false,
      dimension: 0,
      pieces: dates.map((date, index) => ({
        gte: index,
        lte: index,
        color: stageColor(normalizeStage(stageByDate.get(date))),
      })),
    },
    series: [
      {
        name: lifecycle?.label ?? "선택 토픽",
        type: "line",
        smooth: true,
        symbolSize: 9,
        lineStyle: { width: 3 },
        emphasis: { focus: "series" },
        data: values,
        markPoint: {
          data: [
            { name: "정점", coord: [dates[peakIndex], peak], symbol: "pin" },
            {
              name: "현재",
              coord: [dates[dates.length - 1], latestValue],
              symbol: "circle",
            },
          ],
        },
      },
    ],
  };
}

function LifecycleStats({ stats }: { stats: ReturnType<typeof summarizeLifecycle> }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <Stat label="현재 단계" value={stats.currentStage} />
      <Stat label="정점일" value={stats.peakDate} />
      <Stat label="정점 기사 수" value={`${stats.peakValue}건`} />
      <Stat label="누적 기사 수" value={`${stats.total}건`} />
    </div>
  );
}

function LifecycleTimeline({ lifecycle }: { lifecycle?: TopicLifecycle }) {
  const stages = lifecycle?.stages ?? [];
  if (!stages.length) return null;
  return (
    <div className="mt-4 rounded-md border p-4">
      <p className="mb-3 text-sm font-medium">단계 전환 흐름</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((stage) => {
          const normalized = normalizeStage(stage.stage);
          return (
            <div
              key={`${stage.date}-${stage.stage}`}
              className="min-w-32 rounded-md border p-3 text-sm"
              style={{ borderColor: stageColor(normalized) }}
            >
              <p className="font-medium">{normalized}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stage.date}</p>
              <p className="mt-2 text-xs">{stage.value}건</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LifecycleEmptyState({ period }: { period: ApiPeriod }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center">
      <div className="max-w-lg space-y-2">
        <p className="text-lg font-semibold">표시할 라이프사이클 데이터가 없습니다.</p>
        <p className="text-sm leading-6 text-muted-foreground">
          현재 기간은 {period}입니다. 일일 파이프라인이 최근 14일 토픽을 생성하므로 먼저 14일
          기간에서 토픽을 선택해보세요.
        </p>
      </div>
    </div>
  );
}

function summarizeLifecycle(lifecycle?: TopicLifecycle) {
  const series = lifecycle?.series ?? [];
  const stages = lifecycle?.stages ?? [];
  const values = series.map((point) => point.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peakValue = Math.max(...values, 0);
  const peakDate = series.find((point) => point.value === peakValue)?.date ?? "-";
  const currentStage = normalizeStage(stages.at(-1)?.stage);
  return { total, peakValue, peakDate, currentStage };
}

function normalizeStage(stage?: string) {
  if (!stage) return "-";
  if (stage.includes("정점")) return "정점";
  if (stage.includes("부상")) return "부상";
  if (stage.includes("소멸")) return "소멸";
  return stage;
}

function stageColor(stage: string) {
  if (stage === "정점") return "#ef4444";
  if (stage === "부상") return "#f59e0b";
  if (stage === "소멸") return "#94a3b8";
  return "#2563eb";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
