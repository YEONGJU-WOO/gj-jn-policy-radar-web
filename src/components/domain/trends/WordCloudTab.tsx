"use client";

import { useMemo, useState } from "react";

import { WordCloud } from "@/components/charts/WordCloud";
import { AGENDAS, ALL_REGIONS } from "@/components/domain/explorer/constants";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useTopics } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword } from "@/lib/utils/korean-stopwords";
import type { ApiPeriod } from "@/types/api";

export function WordCloudTab() {
  const [period, setPeriod] = useState<ApiPeriod>("30d");
  const [agendas, setAgendas] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [maxWords, setMaxWords] = useState(120);
  const [selectedWord, setSelectedWord] = useState<string | undefined>();
  const topics = useTopics(period);

  const words = useMemo(() => {
    const counts = new Map<string, number>();
    (topics.data?.data ?? []).forEach((topic) => {
      topic.keywords
        .filter(isMeaningfulKoreanKeyword)
        .forEach((keyword) =>
          counts.set(keyword, (counts.get(keyword) ?? 0) + topic.article_count),
        );
    });
    return Array.from(counts, ([name, value]) => ({ name, value }))
      .filter((word) => !agendas.length || agendas.some((agenda) => word.name.includes(agenda)))
      .filter((word) => !regions.length || regions.some((region) => word.name.includes(region)))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords);
  }, [agendas, maxWords, regions, topics.data?.data]);

  const topRows = words.slice(0, 50);
  const dialogAgenda = agendas.length === 1 ? agendas[0] : undefined;
  const dialogRegion = regions.length === 1 ? regions[0] : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-md border p-4">
        <PeriodSelect value={period} onChange={setPeriod} />
        <MultiToggle title="영역" items={AGENDAS} values={agendas} onChange={setAgendas} />
        <MultiToggle title="지역" items={ALL_REGIONS} values={regions} onChange={setRegions} />
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
        <div className="max-h-80 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">단어</th>
                <th className="p-2">빈도</th>
                <th className="p-2">증감</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row, index) => (
                <tr key={row.name} className="border-b">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.value}</td>
                  <td className="p-2 text-emerald-600">+{Math.max(1, 12 - index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ChartCard
        title="워드클라우드"
        description="단어를 클릭하면 현재 화면에서 관련 기사와 상세 내용을 확인합니다."
      >
        <WordCloud
          words={words.length ? words : fallbackWords}
          height={560}
          onClick={(word) => setSelectedWord(word)}
        />
        <RelatedContentDialog
          open={Boolean(selectedWord)}
          onOpenChange={(open) => {
            if (!open) setSelectedWord(undefined);
          }}
          title={`${selectedWord ?? ""} 관련 기사`}
          description="선택한 단어와 현재 필터 조건에 맞는 관련 내용을 확인합니다."
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

const fallbackWords = [
  { name: "광주", value: 30 },
  { name: "전남", value: 28 },
  { name: "AI", value: 22 },
  { name: "해상풍력", value: 20 },
  { name: "교통", value: 16 },
  { name: "의료", value: 14 },
];
