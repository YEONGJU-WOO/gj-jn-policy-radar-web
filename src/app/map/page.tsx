"use client";

import type { EChartsOption } from "echarts";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { RegionMap, type RegionMetric } from "@/components/domain/region-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnalyticsRegionMatrix,
  useRegionArticles,
  useRegionsSummary,
} from "@/lib/hooks/use-dashboard";
import { downloadCsv } from "@/lib/utils/visualization";
import type { ApiPeriod, Article, RegionSummary } from "@/types/api";

type MapMetric = "count" | "sentiment" | "diversity";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const periods: Array<{ value: ApiPeriod; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
];

const agendas = ["전체", "에너지", "산업", "의료", "인구", "교통", "농수산", "문화관광"];

export default function MapPage() {
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [metric, setMetric] = useState<MapMetric>("count");
  const [agenda, setAgenda] = useState("전체");
  const [selected, setSelected] = useState<RegionMetric | undefined>();

  const gwangju = useRegionsSummary("gwangju");
  const jeonnam = useRegionsSummary("jeonnam");
  const regionMatrix = useAnalyticsRegionMatrix(period);
  const regionArticles = useRegionArticles(selected?.code);

  const gwangjuMetrics = useMemo(
    () => toRegionMetrics(gwangju.data?.data, metric, gwangjuFallback),
    [gwangju.data?.data, metric],
  );
  const jeonnamMetrics = useMemo(
    () => toRegionMetrics(jeonnam.data?.data, metric, jeonnamFallback),
    [jeonnam.data?.data, metric],
  );
  const articles = regionArticles.data?.data ?? [];
  const matrix = regionMatrix.data?.data;
  const matrixOption = matrix ? makeMatrixOption(matrix) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">지역 지도 뷰</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          광주 5개 구와 전남 22개 시군의 정책 이슈 밀도, 감성, 영역 분포를 지도에서 비교합니다.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>지도 필터</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={metric} onValueChange={(value) => setMetric(value as MapMetric)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">기사 빈도</SelectItem>
                  <SelectItem value="sentiment">평균 감성</SelectItem>
                  <SelectItem value="diversity">이슈 다양성 지수</SelectItem>
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={(value) => setPeriod(value as ApiPeriod)}>
                <SelectTrigger className="w-32">
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
              <Select value={agenda} onValueChange={setAgenda}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agendas.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5 2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>광주 5개 구</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionMap
                geojsonUrl="/geojson/gwangju.geojson"
                center={[126.88, 35.16]}
                zoom={10}
                metrics={gwangjuMetrics}
                selectedCode={selected?.code}
                onRegionClick={setSelected}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>전남 22개 시군</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionMap
                geojsonUrl="/geojson/jeonnam.geojson"
                center={[126.85, 34.82]}
                zoom={7}
                metrics={jeonnamMetrics}
                selectedCode={selected?.code}
                onRegionClick={setSelected}
              />
            </CardContent>
          </Card>
        </div>

        <RegionSidePanel
          selected={selected}
          articles={articles}
          loading={regionArticles.isLoading}
          matrix={matrix}
          agenda={agenda}
        />
      </div>

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
          {regionMatrix.isLoading || !matrixOption ? (
            <Skeleton className="h-[440px] w-full" />
          ) : (
            <ReactECharts
              option={matrixOption}
              style={{ height: 460, width: "100%" }}
              onEvents={{
                click: (params: { value?: [number, number, number] }) => {
                  if (!matrix || !params.value) return;
                  const [colIndex, rowIndex] = params.value;
                  const region = matrix.rows[rowIndex];
                  const agendaName = matrix.cols[colIndex];
                  window.location.href = `/explorer?region=${encodeURIComponent(region)}&agenda=${encodeURIComponent(agendaName)}`;
                },
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RegionSidePanel({
  selected,
  articles,
  loading,
  matrix,
  agenda,
}: {
  selected?: RegionMetric;
  articles: Article[];
  loading: boolean;
  matrix?: { rows: string[]; cols: string[]; values: number[][] };
  agenda: string;
}) {
  const rowIndex = selected
    ? matrix?.rows.findIndex((row) => row.includes(selected.name) || selected.name.includes(row))
    : -1;
  const rowValues = rowIndex !== undefined && rowIndex >= 0 ? (matrix?.values[rowIndex] ?? []) : [];
  const topAgendaIndex = rowValues.length ? rowValues.indexOf(Math.max(...rowValues)) : -1;
  const topAgenda =
    topAgendaIndex >= 0 ? matrix?.cols[topAgendaIndex] : agenda === "전체" ? "-" : agenda;

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>선택 지역</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selected ? (
          <>
            <div className="rounded-md border p-4">
              <p className="text-lg font-semibold">{selected.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <MetricBox
                  label="기사 수"
                  value={String(articles.length || Math.round(selected.value))}
                />
                <MetricBox
                  label="평균 점수"
                  value={String(Math.round(articlesAverage(articles) || selected.value))}
                />
                <MetricBox label="상위 영역" value={topAgenda ?? "-"} />
              </div>
              <Button asChild className="mt-4 w-full">
                <Link href={`/explorer?region=${encodeURIComponent(selected.name)}`}>
                  이슈 익스플로러에서 보기
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">해당 지역 기사</p>
              {loading ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <div className="grid gap-2">
                  {articles.slice(0, 8).map((article) => (
                    <Link
                      key={article.id}
                      href={`/explorer?article=${article.id}`}
                      className="rounded-md border p-3 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-medium">{article.title}</p>
                        <Badge variant="outline">{Math.round(article.relevance_score)}점</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{article.category}</p>
                    </Link>
                  ))}
                  {!articles.length && (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      아직 표시할 기사가 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            지도에서 행정구역을 클릭하면 KPI와 기사 목록이 표시됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function toRegionMetrics(
  summaries: RegionSummary[] | undefined,
  metric: MapMetric,
  fallback: RegionMetric[],
) {
  if (!summaries?.length) return fallback;
  return summaries.map((summary) => ({
    code: summary.code,
    name: summary.name,
    value:
      metric === "count"
        ? summary.article_count
        : metric === "sentiment"
          ? Math.max(0, summary.average_score)
          : Math.max(1, Math.round(Math.sqrt(summary.article_count) * 10)),
  }));
}

function makeMatrixOption(matrix: {
  rows: string[];
  cols: string[];
  values: number[][];
}): EChartsOption {
  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: {
      position: "top",
      formatter: (params) => {
        const value = (params as { value?: [number, number, number] }).value;
        if (!value) return "";
        return `${matrix.rows[value[1]]} / ${matrix.cols[value[0]]}<br/>기사 수: ${value[2]}`;
      },
    },
    toolbox: { feature: { saveAsImage: { title: "PNG 저장" } }, right: 8 },
    grid: { left: 90, right: 24, top: 48, bottom: 80 },
    xAxis: { type: "category", data: matrix.cols, axisLabel: { rotate: 35 } },
    yAxis: { type: "category", data: matrix.rows },
    visualMap: {
      min: 0,
      max: Math.max(1, ...matrix.values.flat()),
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#dbeafe", "#38bdf8", "#1d4ed8"] },
    },
    series: [
      {
        type: "heatmap",
        data: matrix.values.flatMap((rowValues, rowIndex) =>
          rowValues.map((value, colIndex) => [colIndex, rowIndex, value]),
        ),
        label: { show: true },
      },
    ],
  };
}

function articlesAverage(articles: Article[]) {
  if (!articles.length) return 0;
  return articles.reduce((sum, article) => sum + article.relevance_score, 0) / articles.length;
}

const gwangjuFallback: RegionMetric[] = [
  { code: "gwangju-dong", name: "동구", value: 24 },
  { code: "gwangju-seo", name: "서구", value: 31 },
  { code: "gwangju-nam", name: "남구", value: 18 },
  { code: "gwangju-buk", name: "북구", value: 28 },
  { code: "gwangju-gwangsan", name: "광산구", value: 36 },
];

const jeonnamFallback: RegionMetric[] = [
  "목포",
  "여수",
  "순천",
  "나주",
  "광양",
  "담양",
  "곡성",
  "구례",
  "고흥",
  "보성",
  "화순",
  "장흥",
  "강진",
  "해남",
  "영암",
  "무안",
  "함평",
  "영광",
  "장성",
  "완도",
  "진도",
  "신안",
].map((name, index) => ({
  code: `jeonnam-${index + 1}`,
  name,
  value: 10 + ((index * 7) % 32),
}));
