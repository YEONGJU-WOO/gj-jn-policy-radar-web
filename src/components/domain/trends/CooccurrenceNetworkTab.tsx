"use client";

import dynamic from "next/dynamic";
import { RotateCcw, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useDeferredValue, useMemo, useState } from "react";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { SwitchRow } from "@/components/domain/trends/SwitchRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useArticles, useCooccurrence } from "@/lib/hooks/use-api";
import { isMeaningfulKoreanKeyword } from "@/lib/utils/korean-stopwords";
import type { ApiPeriod, Article, CooccurrenceGraph } from "@/types/api";

const CytoscapeGraph = dynamic(
  () => import("@/components/charts/CytoscapeGraph").then((mod) => mod.CytoscapeGraph),
  { ssr: false },
);

type LayoutName = "cose-bilkent" | "concentric" | "breadthfirst";

export function CooccurrenceNetworkTab() {
  const [period, setPeriod] = useState<ApiPeriod>("7d");
  const [top, setTop] = useState(50);
  const [minWeight, setMinWeight] = useState(1);
  const [layout, setLayout] = useState<LayoutName>("cose-bilkent");
  const [keyword, setKeyword] = useState("");
  const [hideIsolated, setHideIsolated] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const deferredKeyword = useDeferredValue(keyword);
  const { resolvedTheme } = useTheme();
  const cooccurrence = useCooccurrence(period, top);
  const relatedArticles = useArticles({ q: keyword || undefined, limit: 5, offset: 0 });

  const graph = useMemo(
    () => filterGraph(cooccurrence.data?.data, top, hideIsolated),
    [cooccurrence.data?.data, hideIsolated, top],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-md border p-4">
        <PeriodSelect value={period} onChange={setPeriod} />
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>상위 N개 노드</span>
            <span>{top}개</span>
          </div>
          <Slider
            value={[top]}
            min={20}
            max={200}
            step={10}
            onValueChange={([value]) => setTop(value ?? 50)}
          />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>최소 동시출현</span>
            <span>{minWeight}</span>
          </div>
          <Slider
            value={[minWeight]}
            min={1}
            max={20}
            step={1}
            onValueChange={([value]) => setMinWeight(value ?? 1)}
          />
        </div>
        <label className="grid gap-1 text-sm">
          레이아웃
          <Select value={layout} onValueChange={(value) => setLayout(value as LayoutName)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cose-bilkent">cose-bilkent</SelectItem>
              <SelectItem value="concentric">concentric</SelectItem>
              <SelectItem value="breadthfirst">breadthfirst</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="노드 검색"
            className="pl-9"
          />
        </div>
        <SwitchRow
          label="분리된 컴포넌트 숨기기"
          checked={hideIsolated}
          onChange={setHideIsolated}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setResetKey((value) => value + 1)}
        >
          <RotateCcw className="h-4 w-4" />
          그래프 리셋
        </Button>
        {top >= 200 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            노드가 많으면 렌더링이 느려질 수 있습니다. 검색으로 범위를 좁히면 더 부드럽습니다.
          </p>
        ) : null}
        <KeywordPanel keyword={deferredKeyword} articles={relatedArticles.data?.data ?? []} />
      </div>

      <ChartCard
        title="동시출현 네트워크"
        description="노드를 드래그하고, 클릭하면 관련 기사 패널이 현재 화면에서 열립니다."
      >
        <CytoscapeGraph
          graph={graph}
          layoutName={layout}
          minWeight={minWeight}
          dark={resolvedTheme === "dark"}
          highlightKeyword={keyword}
          resetKey={resetKey}
          onNodeClick={(node) => setKeyword(node)}
        />
      </ChartCard>
    </div>
  );
}

function KeywordPanel({ keyword, articles }: { keyword: string; articles: Article[] }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{keyword || "키워드 정보"}</p>
      {keyword ? (
        <RelatedContentDialog
          title={`${keyword} 관련 기사`}
          description="네트워크에서 선택한 키워드의 관련 내용을 현재 화면에서 확인합니다."
          query={{ q: keyword, limit: 30, offset: 0 }}
          trigger={<Button className="mt-2 w-full">관련 내용 보기</Button>}
        />
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          노드를 클릭하면 관련 기사와 인접 정보를 확인할 수 있습니다.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {articles.slice(0, 5).map((article) => (
          <RelatedContentDialog
            key={article.id}
            title={`${keyword || "키워드"} 관련 기사`}
            articles={articles}
            initialArticleId={article.id}
            trigger={
              <button
                type="button"
                className="rounded border p-2 text-left text-sm hover:bg-muted/50"
              >
                <p className="line-clamp-2">{article.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.round(article.relevance_score)}점
                </p>
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}

function filterGraph(graph: CooccurrenceGraph | undefined, top: number, hideIsolated: boolean) {
  if (!graph) return undefined;
  const nodes = [...graph.nodes]
    .filter((node) => isMeaningfulKoreanKeyword(node.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, top);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  if (!hideIsolated) return { nodes, edges };
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return { nodes: nodes.filter((node) => connected.has(node.id)), edges };
}
