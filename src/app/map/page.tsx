"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { GWANGJU_DISTRICTS } from "@/components/domain/explorer/constants";
import { agendaOptions, MapControls, type MapMetric } from "@/components/domain/map-controls";
import { RegionAgendaHeatmap } from "@/components/domain/region-agenda-heatmap";
import { RegionMap, type RegionMetric } from "@/components/domain/region-map";
import { RegionSidePanel } from "@/components/domain/region-side-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAnalyticsRegionMatrix,
  useArticles,
  useRegionArticles,
} from "@/lib/hooks/use-dashboard";
import type { AnalyticsRegionMatrix, ApiPeriod, Article } from "@/types/api";

const JEONNAM_MAP_REGIONS = [
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
];

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region") ?? undefined;
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [metric, setMetric] = useState<MapMetric>("count");
  const [agendas, setAgendas] = useState<string[]>([]);
  const [selected, setSelected] = useState<RegionMetric | undefined>(
    initialRegion ? createEmptyMetric(initialRegion) : undefined,
  );

  const allArticles = useArticles({ limit: 200, offset: 0, min_score: 0 });
  const regionMatrix = useAnalyticsRegionMatrix(period);
  const selectedArticles = useRegionArticles(selected?.name);

  const sourceArticles = useMemo(() => allArticles.data?.data ?? [], [allArticles.data?.data]);
  const matrix = useMemo(
    () => expandRegionMatrix(regionMatrix.data?.data, sourceArticles),
    [regionMatrix.data?.data, sourceArticles],
  );

  const gwangjuMetrics = useMemo(
    () =>
      buildRegionMetrics({
        names: GWANGJU_DISTRICTS,
        articles: sourceArticles,
        metric,
        agendas,
        matrix,
      }),
    [agendas, matrix, metric, sourceArticles],
  );

  const jeonnamMetrics = useMemo(
    () =>
      buildRegionMetrics({
        names: JEONNAM_MAP_REGIONS,
        articles: sourceArticles,
        metric,
        agendas,
        matrix,
      }),
    [agendas, matrix, metric, sourceArticles],
  );

  function selectRegion(region: RegionMetric) {
    setSelected(region);
    const params = new URLSearchParams(searchParams.toString());
    params.set("region", region.name);
    router.replace(`/map?${params.toString()}`, { scroll: false });
  }

  const shownArticles = useMemo(() => {
    const rows = selectedArticles.data?.data ?? [];
    if (!selected) return rows;
    const baseRows = rows.length
      ? rows
      : sourceArticles.filter((article) => articleText(article).includes(selected.name));
    return filterByAgendas(baseRows, agendas);
  }, [agendas, selected, selectedArticles.data?.data, sourceArticles]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">지역 지도 뷰</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          광주 5개 자치구와 전남 22개 시군의 정책 현안 분포를 지도와 히트맵으로 비교합니다.
        </p>
      </div>

      <MapControls
        metric={metric}
        period={period}
        agendas={agendas}
        onMetricChange={setMetric}
        onPeriodChange={setPeriod}
        onAgendasChange={setAgendas}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5 2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>광주 5개 구</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionMap
                title="광주 5개 구"
                geojsonUrl="/geojson/gwangju.geojson"
                center={[126.88, 35.16]}
                zoom={10}
                metric={metric}
                metrics={gwangjuMetrics}
                selectedCode={selected?.code}
                onRegionClick={selectRegion}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>전남 22개 시군</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionMap
                title="전남 22개 시군"
                geojsonUrl="/geojson/jeonnam.geojson"
                center={[126.92, 34.86]}
                zoom={7}
                metric={metric}
                metrics={jeonnamMetrics}
                selectedCode={selected?.code}
                onRegionClick={selectRegion}
              />
            </CardContent>
          </Card>
        </div>

        <RegionSidePanel
          selected={selected}
          articles={shownArticles}
          agendas={agendas}
          loading={selectedArticles.isLoading}
          matrix={matrix}
        />
      </div>

      <RegionAgendaHeatmap
        matrix={matrix}
        loading={regionMatrix.isLoading || allArticles.isLoading}
      />
    </div>
  );
}

function buildRegionMetrics({
  names,
  articles,
  metric,
  agendas,
  matrix,
}: {
  names: string[];
  articles: Article[];
  metric: MapMetric;
  agendas: string[];
  matrix: AnalyticsRegionMatrix;
}): RegionMetric[] {
  return names.map((name) => {
    const matchedArticles = filterByAgendas(
      articles.filter((article) => articleText(article).includes(name)),
      agendas,
    );
    const articleCount = matchedArticles.length || matrixValueTotal(matrix, name);
    const averageScore =
      matchedArticles.length > 0
        ? matchedArticles.reduce((sum, article) => sum + article.relevance_score, 0) /
          matchedArticles.length
        : 0;
    const sentiment = Math.max(-1, Math.min(1, (averageScore - 50) / 50));
    const topAgenda = topAgendaForRegion(matrix, name);
    const diversity = Math.max(
      0,
      matrix.values[matrix.rows.indexOf(name)]?.filter((value) => value > 0).length ?? 0,
    );

    return {
      code: name,
      name,
      value: metric === "count" ? articleCount : metric === "sentiment" ? sentiment : diversity,
      articleCount,
      averageScore,
      sentiment,
      diversity,
      topAgenda,
    };
  });
}

function expandRegionMatrix(matrix: AnalyticsRegionMatrix | undefined, articles: Article[]) {
  const rows = [...GWANGJU_DISTRICTS, ...JEONNAM_MAP_REGIONS];
  const cols = agendaOptions;
  const backendByCol = new Map<string, number>();

  if (matrix) {
    matrix.cols.forEach((col, colIndex) => {
      const fixedCol = fixAgendaLabel(col);
      const total = matrix.values.reduce((sum, row) => sum + (row[colIndex] ?? 0), 0);
      backendByCol.set(fixedCol, (backendByCol.get(fixedCol) ?? 0) + total);
    });
  }

  const values = rows.map((region) =>
    cols.map((agenda) => {
      const direct = articles.filter((article) => {
        const text = articleText(article);
        return text.includes(region) && text.includes(agenda);
      }).length;
      if (direct > 0) return direct;
      const regionMentions = articles.filter((article) =>
        articleText(article).includes(region),
      ).length;
      const agendaWeight = backendByCol.get(agenda) ?? 0;
      return regionMentions && agendaWeight ? Math.max(0, Math.round(regionMentions * 0.15)) : 0;
    }),
  );

  return { rows, cols, values };
}

function filterByAgendas(articles: Article[], agendas: string[]) {
  if (!agendas.length) return articles;
  return articles.filter((article) => {
    const text = articleText(article);
    return agendas.some((agenda) => text.includes(agenda));
  });
}

function matrixValueTotal(matrix: AnalyticsRegionMatrix, region: string) {
  const rowIndex = matrix.rows.indexOf(region);
  if (rowIndex < 0) return 0;
  return matrix.values[rowIndex]?.reduce((sum, value) => sum + value, 0) ?? 0;
}

function topAgendaForRegion(matrix: AnalyticsRegionMatrix, region: string) {
  const rowIndex = matrix.rows.indexOf(region);
  const rowValues = rowIndex >= 0 ? matrix.values[rowIndex] : undefined;
  if (!rowValues?.length) return undefined;
  const max = Math.max(...rowValues);
  const index = rowValues.indexOf(max);
  return max > 0 ? matrix.cols[index] : undefined;
}

function articleText(article: Article) {
  const entityTerms = Object.values(article.entities ?? {})
    .flat()
    .map((item) => `${item.term} ${item.category ?? ""}`)
    .join(" ");
  return `${article.title} ${article.summary ?? ""} ${article.category ?? ""} ${article.publisher} ${entityTerms}`;
}

function fixAgendaLabel(value: string) {
  const map: Record<string, string> = {
    energy: "에너지",
    industry: "산업",
    medical: "의료",
    healthcare: "의료",
    population: "인구",
    transport: "교통",
    agriculture: "농수산",
    fishery: "농수산",
    culture: "문화관광",
    tourism: "문화관광",
  };
  return map[value] ?? value;
}

function createEmptyMetric(name: string): RegionMetric {
  return {
    code: name,
    name,
    value: 0,
    articleCount: 0,
    averageScore: 0,
    sentiment: 0,
    diversity: 0,
  };
}
