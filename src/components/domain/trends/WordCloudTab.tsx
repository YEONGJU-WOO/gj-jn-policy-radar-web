"use client";

import { useMemo, useState } from "react";

import { WordCloud } from "@/components/charts/WordCloud";
import { AGENDAS, ALL_REGIONS } from "@/components/domain/explorer/constants";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsWordCloud } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword, normalizeKeywordTerm } from "@/lib/utils/korean-stopwords";
import type { ApiPeriod } from "@/types/api";

export function WordCloudTab() {
  const [period, setPeriod] = useState<ApiPeriod>("14d");
  const [agendas, setAgendas] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [maxWords, setMaxWords] = useState(120);
  const [selectedWord, setSelectedWord] = useState<string | undefined>();

  const wordcloud = useAnalyticsWordCloud({
    period,
    regions: normalizeRegionFilters(regions),
    agendas,
    limit: maxWords,
  });
  const isInitialLoading = wordcloud.isPending || (wordcloud.isFetching && !wordcloud.data);
  const articleCount = Number(wordcloud.data?.article_count ?? 0);

  const words = useMemo(
    () =>
      (wordcloud.data?.data ?? [])
        .map((word) => ({
          ...word,
          name: normalizeKeywordTerm(word.name),
        }))
        .filter((word) => isMeaningfulKoreanKeyword(word.name))
        .slice(0, maxWords),
    [maxWords, wordcloud.data?.data],
  );

  const topRows = words.slice(0, 50);
  const dialogAgenda = agendas.length === 1 ? agendas[0] : undefined;
  const dialogRegion = regions.length === 1 ? normalizeRegionFilters(regions)[0] : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-md border p-4">
        <PeriodSelect value={period} onChange={setPeriod} />
        <MultiToggle title="정책영역" items={AGENDAS} values={agendas} onChange={setAgendas} />
        <MultiToggle title="지역" items={ALL_REGIONS} values={regions} onChange={setRegions} />
        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          선택한 기간·지역·정책영역에 해당하는 기사 묶음에서 키워드를 다시 집계합니다. 지역명 자체가
          아니라 해당 지역 관련 기사들의 핵심 단어가 클라우드에 표시됩니다.
        </div>
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>최대 단어 수</span>
            <span>{maxWords}개</span>
          </div>
          <Slider
            value={[maxWords]}
            min={50}
            max={300}
            step={10}
            onValueChange={([value]) => setMaxWords(value ?? 120)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {isInitialLoading ? "대상 기사 집계 중" : `대상 기사 ${articleCount}건`}
          </Badge>
          <Badge variant="outline">
            {isInitialLoading ? "단어 추출 중" : `표시 단어 ${words.length}개`}
          </Badge>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">단어</th>
                <th className="p-2">가중 빈도</th>
                <th className="p-2">기사 수</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row) => (
                <tr key={row.name} className="border-b">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.value}</td>
                  <td className="p-2">{row.article_count ?? "-"}</td>
                </tr>
              ))}
              {!topRows.length && !isInitialLoading ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={3}>
                    표시할 단어가 없습니다. 기간이나 필터를 넓혀보세요.
                  </td>
                </tr>
              ) : null}
              {isInitialLoading ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={3}>
                    조건에 맞는 기사에서 키워드를 집계하고 있습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <ChartCard
        title="워드클라우드"
        description="선택한 조건에 맞는 기사 전체에서 추출한 정책 키워드입니다."
      >
        {isInitialLoading ? (
          <Skeleton className="h-[560px] w-full" />
        ) : (
          <WordCloud
            words={words.length ? words : fallbackWords}
            height={560}
            onClick={(word) => setSelectedWord(word)}
          />
        )}
        <RelatedContentDialog
          open={Boolean(selectedWord)}
          onOpenChange={(open) => {
            if (!open) setSelectedWord(undefined);
          }}
          title={`${selectedWord ?? ""} 관련 기사`}
          description="선택한 단어와 현재 필터 조건에 맞는 관련 기사를 확인합니다."
          query={{
            q: selectedWord,
            agenda: dialogAgenda,
            region: dialogRegion,
            limit: 30,
            offset: 0,
          }}
        />
      </ChartCard>
    </div>
  );
}

function MultiToggle({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
        {items.map((item) => {
          const active = values.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() =>
                onChange(active ? values.filter((value) => value !== item) : [...values, item])
              }
            >
              <Badge variant={active ? "default" : "outline"}>{item}</Badge>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function normalizeRegionFilters(regions: string[]) {
  return regions.map((region) => (region === "광주 전체" ? "광주" : region));
}

const fallbackWords = [
  { name: "광주", value: 30 },
  { name: "전남", value: 28 },
  { name: "AI", value: 22 },
  { name: "교육", value: 20 },
  { name: "교통", value: 16 },
  { name: "의료", value: 14 },
];
