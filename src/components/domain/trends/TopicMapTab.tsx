"use client";

import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";

import { EChart } from "@/components/charts/echart";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { TOPIC_PERIODS } from "@/components/domain/trends/constants";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { SwitchRow } from "@/components/domain/trends/SwitchRow";
import { TopicArticlesDrawer } from "@/components/domain/trends/TopicArticlesDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopicArticles, useTopics } from "@/lib/hooks/use-api";
import type { ApiPeriod, Topic } from "@/types/api";

type TopicPoint = Topic & {
  isBundle?: boolean;
  bundledTopicCount?: number;
  bundledArticleCount?: number;
};

const DEFAULT_MIN_SIZE = 3;
const DEFAULT_MAX_VISIBLE = 60;

export function TopicMapTab() {
  const [period, setPeriod] = useState<ApiPeriod>("14d");
  const [showLabels, setShowLabels] = useState(false);
  const [minSize, setMinSize] = useState(DEFAULT_MIN_SIZE);
  const [maxVisible, setMaxVisible] = useState(DEFAULT_MAX_VISIBLE);
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();

  const topics = useTopics(period);
  const fallbackTopics = useTopics("14d");
  const topicArticles = useTopicArticles(selectedTopicId);

  const rawTopics = topics.data?.data ?? [];
  const fallbackRawTopics = fallbackTopics.data?.data ?? [];
  const shouldUseFallback = period === "7d" && !topics.isLoading && rawTopics.length === 0;
  const sourceTopics = shouldUseFallback ? fallbackRawTopics : rawTopics;

  const { visibleTopics, hiddenTopicCount, hiddenArticleCount } = useMemo(
    () => buildVisibleTopics(sourceTopics, minSize, maxVisible),
    [maxVisible, minSize, sourceTopics],
  );
  const activeTopic = visibleTopics.find(
    (topic) => topic.id === selectedTopicId && !topic.isBundle,
  );
  const option = makeTopicMapOption(visibleTopics, showLabels, selectedTopicId);

  const averageSize =
    sourceTopics.reduce((sum, topic) => sum + topic.article_count, 0) /
    Math.max(1, sourceTopics.length);
  const largest = [...sourceTopics].sort((a, b) => b.article_count - a.article_count)[0];
  const isLoading = topics.isLoading || (shouldUseFallback && fallbackTopics.isLoading);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <ChartCard
        title="BERTopic 토픽맵"
        description="기사 묶음을 점으로 표시합니다. 점이 클수록 기사 수가 많고, 중심에 가까울수록 큰 토픽입니다."
        actions={<PeriodSelect value={period} onChange={setPeriod} periods={TOPIC_PERIODS} />}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[180px_1fr_1fr]">
          <SwitchRow label="토픽 라벨 표시" checked={showLabels} onChange={setShowLabels} />
          <ControlSlider
            label="최소 토픽 크기"
            value={minSize}
            suffix="건"
            min={1}
            max={30}
            onChange={setMinSize}
          />
          <ControlSlider
            label="최대 표시 토픽"
            value={maxVisible}
            suffix="개"
            min={20}
            max={120}
            step={10}
            onChange={setMaxVisible}
          />
        </div>

        {shouldUseFallback ? (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            7일 토픽 데이터가 아직 없어 최근 14일 토픽을 대신 표시합니다. 다음 자동 분석 이후 7일
            토픽이 생성되면 해당 기간 데이터로 전환됩니다.
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">전체 {sourceTopics.length}개</Badge>
          <Badge variant="secondary">표시 {visibleTopics.length}개</Badge>
          {hiddenTopicCount ? (
            <Badge variant="outline">
              소규모 묶음 {hiddenTopicCount}개 / {hiddenArticleCount}건
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <Skeleton className="h-[560px] w-full" />
        ) : visibleTopics.length ? (
          <EChart
            option={option}
            height={560}
            ariaLabel="토픽 UMAP 산점도"
            onEvents={{
              click: (params) => {
                const data = (params as { data?: { id?: number; isBundle?: boolean } }).data;
                if (data?.id && !data.isBundle) setSelectedTopicId(data.id);
              },
            }}
          />
        ) : (
          <TopicEmptyState period={period} />
        )}

        <div className="mt-4">
          <TopicArticlesDrawer topic={activeTopic} articles={topicArticles.data?.data ?? []} />
        </div>
      </ChartCard>

      <div className="space-y-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">토픽 통계</p>
          <div className="mt-3 grid gap-2">
            <Stat label="전체 토픽 수" value={`${sourceTopics.length}개`} />
            <Stat label="평균 크기" value={`${averageSize.toFixed(1)}건`} />
            <Stat label="가장 큰 토픽" value={largest?.label ?? "-"} />
          </div>
        </div>
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">토픽 순위</p>
          <div className="grid max-h-[560px] gap-2 overflow-y-auto">
            {[...sourceTopics]
              .sort((a, b) => b.article_count - a.article_count)
              .slice(0, 30)
              .map((topic) => (
                <Button
                  key={topic.id}
                  type="button"
                  variant={topic.id === selectedTopicId ? "default" : "outline"}
                  className="h-auto justify-between whitespace-normal py-2 text-left"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <span className="line-clamp-2">{topic.label}</span>
                  <Badge variant="secondary">{topic.article_count}</Badge>
                </Button>
              ))}
            {!sourceTopics.length ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                아직 표시할 토픽이 없습니다.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next ?? value)}
      />
    </div>
  );
}

function TopicEmptyState({ period }: { period: ApiPeriod }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center">
      <div className="max-w-xl space-y-3">
        <p className="text-lg font-semibold">아직 토픽맵 데이터가 없습니다.</p>
        <p className="text-sm leading-6 text-muted-foreground">
          현재 <code className="rounded bg-muted px-1">/api/topics?period={period}</code> 응답이
          비어 있습니다. 수동 실행 또는 다음 09시 자동 분석 이후 토픽 모델링 결과가 저장되면 이
          화면에 표시됩니다.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded bg-muted/50 p-2 text-sm">
      <span>{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function buildVisibleTopics(topics: Topic[], minSize: number, maxVisible: number) {
  const sorted = [...topics].sort((a, b) => b.article_count - a.article_count);
  const visible = sorted
    .filter((topic) => topic.article_count >= minSize)
    .slice(0, maxVisible) as TopicPoint[];
  const visibleIds = new Set(visible.map((topic) => topic.id));
  const hidden = sorted.filter((topic) => !visibleIds.has(topic.id));
  const hiddenArticleCount = hidden.reduce((sum, topic) => sum + topic.article_count, 0);

  if (hidden.length && visible.length) {
    visible.push({
      id: -1,
      label: "소규모 토픽 묶음",
      keywords: hidden.flatMap((topic) => topic.keywords).slice(0, 10),
      article_count: hiddenArticleCount,
      created_at_kst: "",
      isBundle: true,
      bundledTopicCount: hidden.length,
      bundledArticleCount: hiddenArticleCount,
    });
  }

  return {
    visibleTopics: visible,
    hiddenTopicCount: hidden.length,
    hiddenArticleCount,
  };
}

function makeTopicMapOption(
  topics: TopicPoint[],
  showLabels: boolean,
  selectedId?: number,
): EChartsOption {
  const counts = topics.map((topic) => topic.article_count);
  const maxCount = Math.max(1, ...counts);
  const minCount = Math.min(...counts, maxCount);

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const item = params as {
          data?: {
            name?: string;
            keywords?: string;
            count?: number;
            isBundle?: boolean;
            bundledTopicCount?: number;
          };
        };
        const data = item.data;
        if (data?.isBundle) {
          return `<strong>${data.name}</strong><br/>${data.bundledTopicCount ?? 0}개 토픽<br/>기사 ${data.count ?? 0}건`;
        }
        return `<strong>${data?.name ?? ""}</strong><br/>${data?.keywords ?? ""}<br/>기사 ${data?.count ?? 0}건`;
      },
    },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" }, dataZoom: {} } },
    dataZoom: [{ type: "inside" }],
    grid: { left: 8, right: 8, top: 28, bottom: 20 },
    xAxis: { type: "value", show: false, min: -120, max: 120 },
    yAxis: { type: "value", show: false, min: -90, max: 90 },
    series: [
      {
        type: "scatter",
        data: topics.map((topic, index) => ({
          id: topic.id,
          name: topic.label,
          count: topic.article_count,
          isBundle: topic.isBundle,
          bundledTopicCount: topic.bundledTopicCount,
          keywords: topic.keywords.slice(0, 5).join(", "),
          value: topicCoordinates(topic, index, topics.length),
          symbolSize: topic.isBundle ? 44 : scaleBubble(topic.article_count, minCount, maxCount),
          itemStyle: {
            color: topic.isBundle ? "#94a3b8" : `hsl(${(topic.id * 47) % 360}, 68%, 48%)`,
            borderWidth: selectedId === topic.id ? 4 : 1,
            borderColor: selectedId === topic.id ? "#f59e0b" : "rgba(255,255,255,0.75)",
            opacity: topic.isBundle ? 0.58 : 0.9,
            shadowBlur: topic.isBundle ? 0 : 8,
            shadowColor: "rgba(15, 23, 42, 0.18)",
          },
        })),
        encode: { x: 0, y: 1 },
        label: {
          show: showLabels,
          formatter: "{b}",
          position: "top",
          width: 120,
          overflow: "truncate",
          fontSize: 11,
        },
        emphasis: {
          focus: "self",
          label: { show: true },
          scale: true,
        },
      },
    ],
  };
}

function scaleBubble(count: number, minCount: number, maxCount: number) {
  if (maxCount === minCount) return 34;
  const ratio =
    (Math.sqrt(count) - Math.sqrt(minCount)) / (Math.sqrt(maxCount) - Math.sqrt(minCount));
  return 18 + ratio * 54;
}

function topicCoordinates(topic: TopicPoint, index: number, total: number) {
  if (topic.isBundle) return [96, -68, topic.article_count];
  const ring = index < 8 ? 0 : index < 28 ? 1 : 2;
  const ringIndex = ring === 0 ? index : ring === 1 ? index - 8 : index - 28;
  const ringSize = ring === 0 ? Math.min(8, total) : ring === 1 ? 20 : Math.max(1, total - 28);
  const angle = (ringIndex / Math.max(1, ringSize)) * Math.PI * 2 + ring * 0.34;
  const radius = ring === 0 ? 24 : ring === 1 ? 56 : 86;
  const jitter = ((topic.id * 37) % 11) - 5;
  return [
    Math.cos(angle) * (radius + jitter),
    Math.sin(angle) * (radius + jitter * 0.7),
    topic.article_count,
  ];
}
