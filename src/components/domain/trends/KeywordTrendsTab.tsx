"use client";

import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";

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
import { useDictionary, useSpikes, useTrendKeywords } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword, normalizeKeywordTerm } from "@/lib/utils/korean-stopwords";
import { downloadCsv, lastNDates, movingAverage, trendToSeries } from "@/lib/utils/visualization";
import type { ApiPeriod, SpikeKeyword } from "@/types/api";

export function KeywordTrendsTab() {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [showAverage, setShowAverage] = useState(false);
  const [showSpikes, setShowSpikes] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [autoPresetApplied, setAutoPresetApplied] = useState(false);

  const agendaDictionary = useDictionary("agenda");
  const placeDictionary = useDictionary("places");
  const spikes = useSpikes(period);

  const suggestedFromSpikes = useMemo(
    () =>
      (spikes.data?.data ?? [])
        .map((spike) => normalizeKeywordTerm(spike.term))
        .filter((term, index, array) => array.indexOf(term) === index)
        .filter(isMeaningfulKoreanKeyword)
        .slice(0, 8),
    [spikes.data?.data],
  );

  useEffect(() => {
    if (!autoPresetApplied && suggestedFromSpikes.length >= 4) {
      setKeywords(suggestedFromSpikes);
      setAutoPresetApplied(true);
    }
  }, [autoPresetApplied, suggestedFromSpikes]);

  const trendKeywords = useTrendKeywords(keywords, period);

  const suggestions = useMemo(
    () =>
      [
        suggestedFromSpikes,
        agendaDictionary.data?.data?.map((entry) => entry.term),
        placeDictionary.data?.data?.map((entry) => entry.term),
      ]
        .flatMap((entries) => entries ?? [])
        .map(normalizeKeywordTerm)
        .filter((term, index, array) => array.indexOf(term) === index)
        .filter(isMeaningfulKoreanKeyword)
        .slice(0, 160),
    [agendaDictionary.data?.data, placeDictionary.data?.data, suggestedFromSpikes],
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
        description="많이 등장한 의미 단어를 기본으로 선택합니다. 키워드는 최대 8개까지 직접 추가하거나 제거할 수 있습니다."
        onCsv={() => downloadCsv("keyword-trends.csv", seriesToRows(seriesMap))}
      >
        {trendKeywords.isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <EChart option={option} height={500} ariaLabel="키워드별 일자 기사 수 라인 차트" />
        )}
        <KeywordArticlePreview keyword={keywords[0]} />
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
  const spikeTerms = new Set(
    spikes.filter((item) => item.z_score >= 2).map((item) => normalizeKeywordTerm(item.term)),
  );

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
            options.showSpikes && spikeTerms.has(normalizeKeywordTerm(name))
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
          onClick={() => onSelect(normalizeKeywordTerm(spike.term))}
        >
          <p className="font-medium">{normalizeKeywordTerm(spike.term)}</p>
          <p className="mt-1 text-sm text-muted-foreground">z-score {spike.z_score.toFixed(1)}</p>
        </button>
      ))}
    </div>
  );
}

function KeywordArticlePreview({ keyword }: { keyword?: string }) {
  return (
    <div className="mt-4 rounded-md border p-4">
      <p className="text-sm font-medium">선택 키워드 관련 기사</p>
      <div className="mt-2">
        {keyword ? (
          <RelatedContentDialog
            title={`${keyword} 관련 기사`}
            description="선택한 키워드가 포함된 기사와 요약을 확인합니다."
            query={{ q: keyword, limit: 30, offset: 0 }}
            trigger={
              <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
                {keyword} 기사 보기
              </button>
            }
          />
        ) : (
          <Badge variant="outline">키워드를 선택하면 관련 기사를 볼 수 있습니다.</Badge>
        )}
      </div>
    </div>
  );
}

function addKeyword(keywords: string[], term: string) {
  const clean = normalizeKeywordTerm(term);
  if (!isMeaningfulKoreanKeyword(clean) || keywords.includes(clean) || keywords.length >= 8) {
    return keywords;
  }
  return [...keywords, clean];
}

function seriesToRows(series: Record<string, Array<{ date: string; value: number }>>) {
  return Object.entries(series).flatMap(([term, rows]) =>
    rows.map((row) => ({ keyword: term, date: row.date, value: row.value })),
  );
}
