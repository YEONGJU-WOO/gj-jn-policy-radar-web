"use client";

import dynamic from "next/dynamic";
import { Eye, Network, RotateCcw, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useDeferredValue, useMemo, useState } from "react";

import type { CommunityGraph } from "@/components/charts/CytoscapeGraph";
import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { ChartCard } from "@/components/domain/trends/ChartCard";
import { PeriodSelect } from "@/components/domain/trends/PeriodSelect";
import { SwitchRow } from "@/components/domain/trends/SwitchRow";
import { Badge } from "@/components/ui/badge";
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
import { isMeaningfulKoreanKeyword, normalizeKeywordTerm } from "@/lib/utils/korean-stopwords";
import type { ApiPeriod, Article, CooccurrenceGraph } from "@/types/api";

const CytoscapeGraph = dynamic(
  () => import("@/components/charts/CytoscapeGraph").then((mod) => mod.CytoscapeGraph),
  { ssr: false },
);

type LayoutName = "cose-bilkent" | "concentric" | "breadthfirst";
type NetworkMode = "cluster" | "full";

type CommunitySummary = {
  id: number;
  label: string;
  nodes: string[];
  totalWeight: number;
  edgeCount: number;
};

export function CooccurrenceNetworkTab() {
  const [period, setPeriod] = useState<ApiPeriod>("7d");
  const [top, setTop] = useState(70);
  const [minWeight, setMinWeight] = useState(2);
  const [layout, setLayout] = useState<LayoutName>("cose-bilkent");
  const [mode, setMode] = useState<NetworkMode>("cluster");
  const [selectedCommunity, setSelectedCommunity] = useState<number | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [hideIsolated, setHideIsolated] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const deferredKeyword = useDeferredValue(keyword);
  const { resolvedTheme } = useTheme();
  const cooccurrence = useCooccurrence(period, top);
  const relatedArticles = useArticles({ q: keyword || undefined, limit: 5, offset: 0 });

  const prepared = useMemo(
    () => prepareNetwork(cooccurrence.data?.data, { top, minWeight, hideIsolated }),
    [cooccurrence.data?.data, hideIsolated, minWeight, top],
  );

  const visibleGraph = useMemo(() => {
    if (mode === "full" || selectedCommunity === "all") return prepared.graph;
    return subgraphByCommunity(prepared.graph, selectedCommunity);
  }, [mode, prepared.graph, selectedCommunity]);

  const focusedCommunity =
    selectedCommunity === "all"
      ? prepared.communities[0]
      : prepared.communities.find((community) => community.id === selectedCommunity);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="space-y-4 rounded-md border p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "cluster" ? "default" : "outline"}
            onClick={() => setMode("cluster")}
          >
            <Eye className="h-4 w-4" />
            묶음 보기
          </Button>
          <Button
            type="button"
            variant={mode === "full" ? "default" : "outline"}
            onClick={() => setMode("full")}
          >
            <Network className="h-4 w-4" />
            전체 보기
          </Button>
        </div>

        <PeriodSelect value={period} onChange={setPeriod} />
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>상위 키워드 수</span>
            <span>{top}개</span>
          </div>
          <Slider
            value={[top]}
            min={30}
            max={160}
            step={10}
            onValueChange={([value]) => setTop(value ?? 70)}
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
            onValueChange={([value]) => setMinWeight(value ?? 2)}
          />
        </div>
        <label className="grid gap-1 text-sm">
          배치 방식
          <Select value={layout} onValueChange={(value) => setLayout(value as LayoutName)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cose-bilkent">관계 중심</SelectItem>
              <SelectItem value="concentric">핵심어 중심</SelectItem>
              <SelectItem value="breadthfirst">계층형</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="키워드 검색"
            className="pl-9"
          />
        </div>
        <SwitchRow
          label="연결 없는 키워드 숨기기"
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

        <CommunityList
          communities={prepared.communities}
          selected={selectedCommunity}
          onSelect={setSelectedCommunity}
        />

        <KeywordPanel keyword={deferredKeyword} articles={relatedArticles.data?.data ?? []} />
      </div>

      <ChartCard
        title="동시출현 네트워크"
        description="색이 같은 키워드는 같은 이슈 묶음입니다. 먼저 왼쪽의 묶음을 고른 뒤, 그래프에서 핵심 키워드를 클릭해 관련 기사를 확인하세요."
      >
        <NetworkSummary graph={visibleGraph} community={focusedCommunity} mode={mode} />
        <CytoscapeGraph
          graph={visibleGraph}
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

function CommunityList({
  communities,
  selected,
  onSelect,
}: {
  communities: CommunitySummary[];
  selected: number | "all";
  onSelect: (value: number | "all") => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">이슈 묶음</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => onSelect("all")}>
          전체
        </Button>
      </div>
      <div className="grid max-h-72 gap-2 overflow-y-auto">
        {communities.slice(0, 10).map((community) => (
          <button
            key={community.id}
            type="button"
            className={`rounded-md border p-3 text-left hover:bg-muted/50 ${
              selected === community.id ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onSelect(community.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="line-clamp-1 text-sm font-semibold">
                {community.nodes.slice(0, 3).join(" / ")}
              </p>
              <Badge variant="secondary">{community.nodes.length}개</Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {community.nodes.slice(0, 6).join(", ")}
            </p>
          </button>
        ))}
        {!communities.length ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            표시할 묶음이 없습니다. 최소 동시출현 값을 낮춰보세요.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NetworkSummary({
  graph,
  community,
  mode,
}: {
  graph: CommunityGraph;
  community?: CommunitySummary;
  mode: NetworkMode;
}) {
  const topNodes = [...graph.nodes].sort((a, b) => b.weight - a.weight).slice(0, 8);
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-md border bg-muted/20 p-3">
        <p className="text-sm text-muted-foreground">{mode === "cluster" ? "선택 묶음" : "전체"}</p>
        <p className="mt-1 text-lg font-semibold">
          {community?.nodes.slice(0, 3).join(" / ") ?? "전체 네트워크"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          노드 {graph.nodes.length}개 · 연결 {graph.edges.length}개
        </p>
      </div>
      <div className="rounded-md border bg-muted/20 p-3">
        <p className="mb-2 text-sm text-muted-foreground">핵심 키워드</p>
        <div className="flex flex-wrap gap-1.5">
          {topNodes.map((node) => (
            <Badge key={node.id} variant="outline">
              {node.id}
            </Badge>
          ))}
        </div>
      </div>
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
          키워드를 클릭하면 관련 기사와 인접 키워드를 확인할 수 있습니다.
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

function prepareNetwork(
  graph: CooccurrenceGraph | undefined,
  options: { top: number; minWeight: number; hideIsolated: boolean },
): { graph: CommunityGraph; communities: CommunitySummary[] } {
  if (!graph) return { graph: { nodes: [], edges: [] }, communities: [] };

  const nodes = [...graph.nodes]
    .map((node) => ({ ...node, id: normalizeKeywordTerm(node.id) }))
    .filter(
      (node, index, array) => node.id && array.findIndex((item) => item.id === node.id) === index,
    )
    .filter((node) => isMeaningfulKoreanKeyword(node.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, options.top);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .map((edge) => ({
      ...edge,
      source: normalizeKeywordTerm(edge.source),
      target: normalizeKeywordTerm(edge.target),
    }))
    .filter(
      (edge) =>
        ids.has(edge.source) &&
        ids.has(edge.target) &&
        edge.source !== edge.target &&
        edge.weight >= options.minWeight,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.max(90, options.top * 3));

  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const visibleNodes = options.hideIsolated
    ? nodes.filter((node) => connected.has(node.id))
    : nodes;
  const communities = buildCommunities(visibleNodes, edges);
  const communityByNode = new Map<string, number>(
    communities.flatMap((community) =>
      community.nodes.map((node: string) => [node, community.id] as const),
    ),
  );

  return {
    graph: {
      nodes: visibleNodes.map((node) => ({
        ...node,
        community: communityByNode.get(node.id) ?? 0,
      })),
      edges,
    },
    communities,
  };
}

function buildCommunities(
  nodes: CooccurrenceGraph["nodes"],
  edges: CooccurrenceGraph["edges"],
): CommunitySummary[] {
  const idSet = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();
  const weightedAdjacency = new Map<string, Map<string, number>>();
  nodes.forEach((node) => adjacency.set(node.id, new Set()));
  nodes.forEach((node) => weightedAdjacency.set(node.id, new Map()));
  edges.forEach((edge) => {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) return;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    weightedAdjacency.get(edge.source)?.set(edge.target, edge.weight);
    weightedAdjacency.get(edge.target)?.set(edge.source, edge.weight);
  });

  const byWeight = new Map(nodes.map((node) => [node.id, node.weight]));
  const labels = new Map(nodes.map((node) => [node.id, node.id]));
  const orderedNodes = [...nodes].sort((a, b) => b.weight - a.weight);

  for (let round = 0; round < 8; round += 1) {
    orderedNodes.forEach((node) => {
      const scores = new Map<string, number>();
      weightedAdjacency.get(node.id)?.forEach((weight: number, neighbor: string) => {
        const label = labels.get(neighbor) ?? neighbor;
        scores.set(label, (scores.get(label) ?? 0) + weight + (byWeight.get(neighbor) ?? 0) * 0.02);
      });
      const best = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0];
      if (best) labels.set(node.id, best[0]);
    });
  }

  const grouped = new Map<string, string[]>();
  nodes.forEach((node) => {
    const label = labels.get(node.id) ?? node.id;
    const group = grouped.get(label) ?? [];
    group.push(node.id);
    grouped.set(label, group);
  });

  const groups = Array.from(grouped.values()).map((group: string[]) =>
    group.sort((a, b) => (byWeight.get(b) ?? 0) - (byWeight.get(a) ?? 0)),
  );

  const smallGroups = groups.filter((group) => group.length <= 2);
  const largeGroups = groups.filter((group) => group.length > 2);
  if (smallGroups.length > 3) {
    const merged = smallGroups
      .flat()
      .sort((a: string, b: string) => (byWeight.get(b) ?? 0) - (byWeight.get(a) ?? 0));
    largeGroups.push(merged);
  } else {
    largeGroups.push(...smallGroups);
  }

  return largeGroups
    .filter((group) => group.length > 0)
    .map((group, index) => {
      const edgeCount = edges.filter(
        (edge) => group.includes(edge.source) && group.includes(edge.target),
      ).length;
      return {
        id: index,
        label: group.slice(0, 3).join(" · "),
        nodes: group,
        totalWeight: group.reduce(
          (sum: number, node: string) => sum + (byWeight.get(node) ?? 0),
          0,
        ),
        edgeCount,
      };
    })
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .map((community, index) => ({ ...community, id: index }));
}

function subgraphByCommunity(graph: CommunityGraph, communityId: number): CommunityGraph {
  const nodes = graph.nodes.filter((node) => node.community === communityId);
  const ids = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
  };
}
