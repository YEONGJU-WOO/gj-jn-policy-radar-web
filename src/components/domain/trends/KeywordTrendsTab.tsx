"use client";

import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";

import { EChart } from "@/components/charts/echart";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { DEFAULT_KEYWORDS, TREND_COLORS } from "@/components/domain/trends/constants";
import { KeywordSelector } from "@/components/domain/trends/KeywordSelector";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { SwitchRow } from "@/components/domain/trends/SwitchRow";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary, useSpikes, useTopicArticles, useTrendKeywords } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword } from "@/lib/utils/korean-stopwords";
import { downloadCsv, lastNDates, movingAverage, trendToSeries } from "@/lib/utils/visualization";
import type { ApiPeriod, Article, SpikeKeyword } from "@/types/api";

export function KeywordTrendsTab() {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [showAverage, setShowAverage] = useState(false);
  const [showSpikes, setShowSpikes] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const agendaDictionary = useDictionary("agenda");
  const placeDictionary = useDictionary("places");
  const trendKeywords = useTrendKeywords(keywords, period);
  const spikes = useSpikes(period);
  const previewArticles = useTopicArticles(undefined);

  const suggestions = useMemo(
    () =>
      [agendaDictionary.data?.data, placeDictionary.data?.data]
        .flatMap((entries) => entries ?? [])
        .map((entry) => entry.term)
        .filter(isMeaningfulKoreanKeyword)
        .filter(Boolean)
        .slice(0, 120),
    [agendaDictionary.data?.data, placeDictionary.data?.data],
  );

  const days = Number(period.replace("d", ""));
  const seriesMap = trendToSeries(trendKeywords.data?.data ?? {}, days);
  const option = makeKeywordOption(seriesMap, spikes.data?.data ?? [], {
    showAverage,
    showSpikes,
    logScale,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardContent className="space-y-5 p-5">
          <KeywordSelector value={keywords} suggestions={suggestions} onChange={setKeywords} />
          <PeriodSelect value={period} onChange={setPeriod} />
          <SwitchRow label="7일 이동평균 표시" checked={showAverage} onChange={setShowAverage} />
          <SwitchRow label="스파이크 마커" checked={showSpikes} onChange={setShowSpikes} />
          <SwitchRow label="로그 스케일" checked={logScale} onChange={setLogScale} />
        </CardContent>
      </Card>

      <ChartCard
        title="키워드 멀티라인 비교"
        description="범례를 클릭하면 시리즈를 숨기거나 다시 볼 수 있습니다."
        onCsv={() => downloadCsv("keyword-trends.csv", seriesToRows(seriesMap))}
      >
        {trendKeywords.isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <EChart option={option} height={500} ariaLabel="키워드별 일자 기사 수 라인 차트" />
        )}
        <ArticlePreview articles={previewArticles.data?.data ?? []} />
        <SpikeCards
          spikes={(spikes.data?.data ?? []).filter((spike) =>
            isMeaningfulKoreanKeyword(spike.term),
          )}
          onSelect={(term) => setKeywords(addKeyword(keywords, term))}
        />
      </ChartCard>
    </div>
  );
}

function makeKeywordOption(
  seriesMap: Record<string, Array<{ date: string; value: number }>>,
  spikes: SpikeKeyword[],
  options: { showAverage: boolean; showSpikes: boolean; logScale: boolean },
): EChartsOption {
  const dates = Array.from(
    new Set(Object.values(seriesMap).flatMap((series) => series.map((point) => point.date))),
  ).sort();
  const axisDates = dates.length ? dates : lastNDates(30);
  const spikeTerms = new Set(spikes.filter((item) => item.z_score >= 2).map((item) => item.term));

  return {
    textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
    tooltip: { trigger: "axis" },
    legend: { top: 0, type: "scroll" },
    toolbox: { right: 8, feature: { saveAsImage: { title: "PNG 저장" } } },
    grid: { left: 44, right: 28, bottom: 36, top: 62 },
    xAxis: { type: "category", data: axisDates },
    yAxis: { type: options.logScale ? "log" : "value", name: "기사 수" },
    series: Object.entries(seriesMap).flatMap(([name, rows], index) => {
      const dataRows = options.showAverage ? movingAverage(rows) : rows;
      return [
        {
          name,
          type: "line",
          smooth: true,
          symbolSize: 7,
          itemStyle: { color: TREND_COLORS[index % TREND_COLORS.length] },
          data: axisDates.map((date) => dataRows.find((point) => point.date === date)?.value ?? 0),
          markPoint:
            options.showSpikes && spikeTerms.has(name)
              ? { data: [{ type: "max", name: "스파이크" }] }
              : undefined,
        },
      ];
    }),
  };
}

function SpikeCards({
  spikes,
  onSelect,
}: {
  spikes: SpikeKeyword[];
  onSelect: (term: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-3">
      {spikes.slice(0, 6).map((spike) => (
        <button
          key={spike.term}
          type="button"
          className="rounded-md border p-3 text-left hover:bg-muted/50"
          onClick={() => onSelect(spike.term)}
        >
          <p className="font-medium">{spike.term}</p>
          <p className="mt-1 text-sm text-muted-foreground">z-score {spike.z_score.toFixed(1)}</p>
        </button>
      ))}
    </div>
  );
}

function ArticlePreview({ articles }: { articles: Article[] }) {
  return (
    <div className="mt-4 rounded-md border p-4">
      <p className="text-sm font-medium">호버 날짜 관련 기사 미리보기</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {articles.slice(0, 3).map((article) => (
          <RelatedContentDialog
            key={article.id}
            title="키워드 관련 기사"
            articles={articles}
            initialArticleId={article.id}
            trigger={
              <button
                type="button"
                className="min-w-64 rounded-md border p-3 text-left text-sm hover:bg-muted/50"
              >
                <p className="line-clamp-2">{article.title}</p>
              </button>
            }
          />
        ))}
        {!articles.length ? <Badge variant="outline">차트 축 기반 미리보기 영역</Badge> : null}
      </div>
    </div>
  );
}

function addKeyword(keywords: string[], term: string) {
  if (!isMeaningfulKoreanKeyword(term) || keywords.includes(term) || keywords.length >= 8) {
    return keywords;
  }
  return [...keywords, term];
}

function seriesToRows(series: Record<string, Array<{ date: string; value: number }>>) {
  return Object.entries(series).flatMap(([term, rows]) =>
    rows.map((row) => ({ keyword: term, date: row.date, value: row.value })),
  );
}
