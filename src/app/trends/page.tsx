"use client";

import type { EChartsOption } from "echarts";
import { Download, Search } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { NetworkGraph } from "@/components/domain/network-graph";
import { WordCloudPanel } from "@/components/domain/word-cloud-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnalyticsLifecycle,
  useCooccurrence,
  useDictionary,
  useSpikes,
  useTopicArticles,
  useTopics,
  useTrendKeywords,
} from "@/lib/hooks/use-dashboard";
import { downloadCsv, lastNDates, trendToSeries } from "@/lib/utils/visualization";
import type { ApiPeriod, Article, Topic } from "@/types/api";

type TrendPeriod = ApiPeriod;
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const periods: Array<{ value: TrendPeriod; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
];

const agendaOptions = ["전체", "에너지", "산업", "의료", "인구", "교통", "농수산", "문화관광"];

export default function TrendsPage() {
  const [keywordInput, setKeywordInput] = useState("AI, 해상풍력, 교통");
  const [period, setPeriod] = useState<TrendPeriod>("30d");
  const [spikeMarkers, setSpikeMarkers] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const [showTopicLabels, setShowTopicLabels] = useState(true);
  const [agenda, setAgenda] = useState("전체");
  const [networkKeyword, setNetworkKeyword] = useState("");

  const agendaDictionary = useDictionary("agenda");
  const placeDictionary = useDictionary("places");
  const institutionDictionary = useDictionary("institutions");
  const peopleDictionary = useDictionary("people");
  const topics = useTopics("30d");
  const topicArticles = useTopicArticles(selectedTopicId);
  const trendKeywords = useTrendKeywords(parseKeywords(keywordInput), period);
  const spikes = useSpikes(period);
  const cooccurrence = useCooccurrence(period, 50);
  const lifecycle = useAnalyticsLifecycle(selectedTopicId);
  const agendaEntries = agendaDictionary.data?.data;
  const placeEntries = placeDictionary.data?.data;
  const institutionEntries = institutionDictionary.data?.data;
  const peopleEntries = peopleDictionary.data?.data;

  const keywordSuggestions = useMemo(
    () =>
      [agendaEntries, placeEntries, institutionEntries, peopleEntries]
        .flatMap((entries) => entries ?? [])
        .map((entry) => entry.term)
        .filter(Boolean)
        .slice(0, 80),
    [agendaEntries, institutionEntries, peopleEntries, placeEntries],
  );

  const trendSeries = trendToSeries(
    trendKeywords.data?.data ?? {},
    Number(period.replace("d", "")),
  );
  const topicList = topics.data?.data ?? [];
  const activeTopic = topicList.find((topic) => topic.id === selectedTopicId) ?? topicList[0];
  const wordCloudWords = topicList
    .flatMap((topic) => topic.keywords.map((text) => ({ text, value: topic.article_count })))
    .filter((word) => agenda === "전체" || word.text.includes(agenda));

  const keywordOption = makeKeywordOption(trendSeries, spikes.data?.data ?? [], spikeMarkers);
  const topicOption = makeTopicMapOption(topicList, showTopicLabels);
  const lifecycleOption = makeLifecycleOption(lifecycle.data?.data);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">트렌드 & 토픽</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          키워드 흐름, 토픽 군집, 동시출현 네트워크를 묶어서 정책 이슈의 확산과 수명을 봅니다.
        </p>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5">
          <TabsTrigger value="keywords">키워드</TabsTrigger>
          <TabsTrigger value="topic-map">토픽맵</TabsTrigger>
          <TabsTrigger value="wordcloud">워드클라우드</TabsTrigger>
          <TabsTrigger value="network">네트워크</TabsTrigger>
          <TabsTrigger value="lifecycle">라이프사이클</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>키워드 멀티라인 비교</CardTitle>
                <ChartActions
                  onCsv={() => downloadCsv("keyword-trends.csv", seriesToRows(trendSeries))}
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_140px_180px]">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                      placeholder="최대 8개 키워드, 쉼표로 구분"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {keywordSuggestions.slice(0, 12).map((term) => (
                      <button
                        key={term}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => setKeywordInput(addKeyword(keywordInput, term))}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
                <PeriodSelect value={period} onChange={setPeriod} />
                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={spikeMarkers}
                    onChange={(event) => setSpikeMarkers(event.target.checked)}
                  />
                  스파이크 자동 탐지
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {trendKeywords.isLoading ? (
                <Skeleton className="h-[460px] w-full" />
              ) : (
                <ReactECharts option={keywordOption} style={{ height: 480, width: "100%" }} />
              )}
              <ArticlePreview
                articles={topicArticles.data?.data ?? []}
                title="호버 날짜 기사 미리보기"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topic-map">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>BERTopic UMAP 2D 토픽맵</CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTopicLabels}
                  onChange={(event) => setShowTopicLabels(event.target.checked)}
                />
                토픽 라벨 표시
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {topics.isLoading ? (
                <Skeleton className="h-[520px] w-full" />
              ) : (
                <ReactECharts
                  option={topicOption}
                  style={{ height: 540, width: "100%" }}
                  onEvents={{
                    click: (params: { data?: { id?: number } }) => {
                      if (params.data?.id) setSelectedTopicId(params.data.id);
                    },
                  }}
                />
              )}
              <TopicArticleList topic={activeTopic} articles={topicArticles.data?.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wordcloud">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>워드클라우드</CardTitle>
                <div className="flex gap-2">
                  <PeriodSelect value={period} onChange={setPeriod} />
                  <Select value={agenda} onValueChange={setAgenda}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agendaOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <WordCloudPanel
                words={wordCloudWords.length ? wordCloudWords : fallbackWords}
                onWordClick={(word) => {
                  window.location.href = `/explorer?q=${encodeURIComponent(word)}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>동시출현 네트워크</CardTitle>
                <div className="flex gap-2">
                  <Input
                    value={networkKeyword}
                    onChange={(event) => setNetworkKeyword(event.target.value)}
                    placeholder="노드 검색"
                    className="w-44"
                  />
                  <PeriodSelect value={period} onChange={setPeriod} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <NetworkGraph
                graph={filterGraph(cooccurrence.data?.data, networkKeyword)}
                onNodeClick={(keyword) => setNetworkKeyword(keyword)}
              />
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm">키워드 관련 기사</CardTitle>
                </CardHeader>
                <CardContent>
                  {networkKeyword ? (
                    <Button asChild className="w-full">
                      <Link href={`/explorer?q=${encodeURIComponent(networkKeyword)}`}>
                        {networkKeyword} 기사 보기
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      노드를 클릭하면 해당 키워드 기사 패널이 열립니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>이슈 라이프사이클</CardTitle>
                <Select
                  value={String(selectedTopicId ?? activeTopic?.id ?? "")}
                  onValueChange={(value) => setSelectedTopicId(Number(value))}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="토픽 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {topicList.map((topic) => (
                      <SelectItem key={topic.id} value={String(topic.id)}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lifecycle.isLoading ? (
                <Skeleton className="h-[460px] w-full" />
              ) : (
                <ReactECharts option={lifecycleOption} style={{ height: 480, width: "100%" }} />
              )}
              <TopicArticleList topic={activeTopic} articles={topicArticles.data?.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PeriodSelect({
  value,
  onChange,
}: {
  value: TrendPeriod;
  onChange: (value: TrendPeriod) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TrendPeriod)}>
      <SelectTrigger className="w-full min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periods.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChartActions({ onCsv }: { onCsv: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onCsv}>
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Badge variant="outline">PNG는 차트 우상단 저장 버튼</Badge>
    </div>
  );
}

function TopicArticleList({ topic, articles }: { topic?: Topic; articles: Article[] }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{topic?.label ?? "토픽을 선택하세요"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {topic?.keywords.slice(0, 5).join(", ") ||
              "산점도 점을 클릭하면 관련 기사가 표시됩니다."}
          </p>
        </div>
        {topic && <Badge variant="outline">{topic.article_count}건</Badge>}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {articles.slice(0, 6).map((article) => (
          <Link
            key={article.id}
            href={`/explorer?article=${article.id}`}
            className="rounded-md border p-3 text-sm hover:bg-muted/50"
          >
            <p className="line-clamp-2 font-medium">{article.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round(article.relevance_score)}점
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArticlePreview({ title, articles }: { title: string; articles: Article[] }) {
  return (
    <div className="mt-4 rounded-md border p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {(articles.length ? articles : []).slice(0, 5).map((article) => (
          <Link
            key={article.id}
            href={`/explorer?article=${article.id}`}
            className="min-w-64 rounded-md border p-3 text-sm hover:bg-muted/50"
          >
            <p className="line-clamp-2">{article.title}</p>
          </Link>
        ))}
        {!articles.length && (
          <p className="text-sm text-muted-foreground">
            차트의 날짜 축을 기준으로 관련 기사 미리보기를 확장할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function addKeyword(current: string, term: string) {
  const values = parseKeywords(current);
  if (values.includes(term) || values.length >= 8) return current;
  return [...values, term].join(", ");
}

function makeKeywordOption(
  seriesMap: Record<string, Array<{ date: string; value: number }>>,
  spikes: Array<{ term: string; z_score: number; count: number }>,
  spikeMarkers: boolean,
): EChartsOption {
  const dates = Array.from(
    new Set(Object.values(seriesMap).flatMap((series) => series.map((point) => point.date))),
  ).sort();
  const spikeTerms = new Set(spikes.filter((item) => item.z_score >= 2).map((item) => item.term));

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: { trigger: "axis" },
    legend: { top: 0, type: "scroll" },
    toolbox: { feature: { saveAsImage: { title: "PNG 저장" } }, right: 8 },
    grid: { left: 40, right: 24, bottom: 36, top: 58 },
    xAxis: { type: "category", data: dates.length ? dates : lastNDates(30) },
    yAxis: { type: "value", name: "등장 횟수" },
    series: Object.entries(seriesMap).map(([name, series]) => ({
      name,
      type: "line",
      smooth: true,
      symbolSize: 7,
      data: (dates.length ? dates : lastNDates(30)).map(
        (date) => series.find((point) => point.date === date)?.value ?? 0,
      ),
      markPoint:
        spikeMarkers && spikeTerms.has(name)
          ? { data: [{ type: "max", name: "스파이크" }] }
          : undefined,
    })),
  };
}

function makeTopicMapOption(topics: Topic[], showLabels: boolean): EChartsOption {
  const data = topics.map((topic, index) => ({
    id: topic.id,
    name: topic.label,
    value: topicCoordinates(topic, index),
    symbolSize: Math.max(18, Math.min(72, topic.article_count * 3)),
    keywords: topic.keywords.slice(0, 5).join(", "),
  }));

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      formatter: (params) => {
        const item = params as { data?: { name?: string; keywords?: string; value?: number[] } };
        return `<strong>${item.data?.name ?? ""}</strong><br/>${item.data?.keywords ?? ""}`;
      },
    },
    toolbox: { feature: { saveAsImage: { title: "PNG 저장" } }, right: 8 },
    xAxis: { type: "value", show: false },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "scatter",
        data,
        encode: { x: 0, y: 1 },
        label: { show: showLabels, formatter: "{b}", position: "top" },
        itemStyle: {
          color: (params) => {
            const palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
            return palette[(params.dataIndex ?? 0) % palette.length];
          },
        },
      },
    ],
  };
}

function makeLifecycleOption(lifecycle?: {
  label: string;
  series: Array<{ date: string; value: number }>;
  stages: Array<{ date: string; stage: string; value: number }>;
}): EChartsOption {
  const dates = lifecycle?.series.map((point) => point.date) ?? lastNDates(30);
  const values =
    lifecycle?.series.map((point) => point.value) ??
    dates.map((_, index) => Math.round(Math.sin(index / 3) * 8 + index + 12));
  const stageByDate = new Map((lifecycle?.stages ?? []).map((item) => [item.date, item.stage]));

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const date = String((item as { axisValue?: string }).axisValue ?? "");
        return `${date}<br/>단계: ${stageByDate.get(date) ?? "관찰"}<br/>기사 수: ${(item as { data?: number }).data ?? 0}`;
      },
    },
    toolbox: { feature: { saveAsImage: { title: "PNG 저장" } }, right: 8 },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value", name: "기사 수" },
    visualMap: {
      show: false,
      dimension: 0,
      pieces: [
        { lte: Math.floor(dates.length * 0.33), color: "#38bdf8" },
        {
          gt: Math.floor(dates.length * 0.33),
          lte: Math.floor(dates.length * 0.66),
          color: "#f59e0b",
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
            {
              name: "정점",
              coord: [dates[values.indexOf(Math.max(...values))], Math.max(...values)],
              symbol: "star",
            },
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

function topicCoordinates(topic: Topic, index: number) {
  const angle = index * 1.75;
  const radius = 20 + (topic.article_count % 18) * 3;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, topic.article_count];
}

function filterGraph(graph: Parameters<typeof NetworkGraph>[0]["graph"], keyword: string) {
  if (!graph || !keyword.trim()) return graph;
  const term = keyword.trim();
  const nodes = graph.nodes.filter((node) => node.id.includes(term));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) || ids.has(edge.target));
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return {
    nodes: graph.nodes.filter((node) => connected.has(node.id) || ids.has(node.id)),
    edges,
  };
}

function seriesToRows(series: Record<string, Array<{ date: string; value: number }>>) {
  return Object.entries(series).flatMap(([term, rows]) =>
    rows.map((row) => ({ keyword: term, date: row.date, value: row.value })),
  );
}

const fallbackWords = [
  { text: "광주", value: 30 },
  { text: "전남", value: 28 },
  { text: "AI", value: 22 },
  { text: "해상풍력", value: 20 },
  { text: "교통", value: 16 },
  { text: "의료", value: 14 },
];
