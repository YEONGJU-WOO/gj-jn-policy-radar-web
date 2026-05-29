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

export function TopicMapTab() {
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [showLabels, setShowLabels] = useState(true);
  const [minSize, setMinSize] = useState(1);
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const topics = useTopics(period);
  const topicArticles = useTopicArticles(selectedTopicId);

  const topicList = useMemo(
    () => (topics.data?.data ?? []).filter((topic) => topic.article_count >= minSize),
    [minSize, topics.data?.data],
  );
  const activeTopic = topicList.find((topic) => topic.id === selectedTopicId);
  const option = makeTopicMapOption(topicList, showLabels, selectedTopicId);

  const averageSize =
    topicList.reduce((sum, topic) => sum + topic.article_count, 0) / Math.max(1, topicList.length);
  const largest = [...topicList].sort((a, b) => b.article_count - a.article_count)[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <ChartCard
        title="BERTopic UMAP 2D 토픽맵"
        description="점 크기는 기사 수, 색상은 토픽 ID를 나타냅니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <PeriodSelect value={period} onChange={setPeriod} periods={TOPIC_PERIODS} />
          </div>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-[180px_1fr]">
          <SwitchRow label="토픽 라벨 표시" checked={showLabels} onChange={setShowLabels} />
          <div className="rounded-md border p-3">
            <div className="mb-2 flex justify-between text-sm">
              <span>최소 토픽 크기</span>
              <span>{minSize}건</span>
            </div>
            <Slider
              value={[minSize]}
              min={1}
              max={50}
              step={1}
              onValueChange={([value]) => setMinSize(value ?? 1)}
            />
          </div>
        </div>
        {topics.isLoading ? (
          <Skeleton className="h-[540px] w-full" />
        ) : (
          <EChart
            option={option}
            height={540}
            ariaLabel="토픽 UMAP 산점도"
            onEvents={{
              click: (params) => {
                const data = (params as { data?: { id?: number } }).data;
                if (data?.id) setSelectedTopicId(data.id);
              },
            }}
          />
        )}
        <div className="mt-4">
          <TopicArticlesDrawer topic={activeTopic} articles={topicArticles.data?.data ?? []} />
        </div>
      </ChartCard>

      <div className="space-y-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">토픽 통계</p>
          <div className="mt-3 grid gap-2">
            <Stat label="총 토픽 수" value={`${topicList.length}개`} />
            <Stat label="평균 크기" value={`${averageSize.toFixed(1)}건`} />
            <Stat label="가장 큰 토픽" value={largest?.label ?? "-"} />
          </div>
        </div>
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">토픽 순위</p>
          <div className="grid max-h-[520px] gap-2 overflow-y-auto">
            {[...topicList]
              .sort((a, b) => b.article_count - a.article_count)
              .slice(0, 24)
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
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded bg-muted/50 p-2 text-sm">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function makeTopicMapOption(
  topics: Topic[],
  showLabels: boolean,
  selectedId?: number,
): EChartsOption {
  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      formatter: (params) => {
        const item = params as { data?: { name?: string; keywords?: string; count?: number } };
        return `<strong>${item.data?.name ?? ""}</strong><br/>${item.data?.keywords ?? ""}<br/>기사 ${item.data?.count ?? 0}건`;
      },
    },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" }, dataZoom: {} } },
    dataZoom: [{ type: "inside" }, { type: "slider", bottom: 4 }],
    grid: { left: 8, right: 8, top: 28, bottom: 40 },
    xAxis: { type: "value", show: false },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "scatter",
        data: topics.map((topic, index) => ({
          id: topic.id,
          name: topic.label,
          count: topic.article_count,
          keywords: topic.keywords.slice(0, 5).join(", "),
          value: topicCoordinates(topic, index),
          symbolSize: Math.max(18, Math.min(80, topic.article_count * 3)),
          itemStyle: {
            color: `hsl(${(topic.id * 53) % 360}, 70%, 48%)`,
            borderWidth: selectedId === topic.id ? 4 : 0,
            borderColor: "#f59e0b",
          },
        })),
        encode: { x: 0, y: 1 },
        label: { show: showLabels, formatter: "{b}", position: "top" },
      },
    ],
  };
}

function topicCoordinates(topic: Topic, index: number) {
  const angle = index * 1.75;
  const radius = 20 + (topic.article_count % 20) * 3;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, topic.article_count];
}
