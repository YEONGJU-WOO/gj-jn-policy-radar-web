"use client";

import dayjs from "dayjs";
import { Bookmark, ExternalLink, RotateCcw, Search, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useArticle,
  useArticles,
  useCreateBookmark,
  useSimilarArticles,
} from "@/lib/hooks/use-dashboard";
import { formatDateKST, highlightTerms } from "@/lib/utils/format";
import type { Article, ArticleDetail, Period } from "@/types/api";

const SOURCES = ["정책브리핑", "연합뉴스"];
const AGENDAS = ["에너지", "산업", "의료", "인구", "교통", "농수산", "문화관광"];
const GWANGJU_REGIONS = ["동구", "서구", "남구", "북구", "광산구"];
const JEONNAM_REGIONS = [
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
const REGIONS = [...GWANGJU_REGIONS, ...JEONNAM_REGIONS];

type Filters = {
  period: Period;
  sources: string[];
  agendas: string[];
  regions: string[];
  minScore: number;
  q: string;
};

const DEFAULT_FILTERS: Filters = {
  period: "7d",
  sources: [],
  agendas: [],
  regions: [],
  minScore: 30,
  q: "",
};

export default function ExplorerPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<"score" | "published" | "relevance">("score");
  const [page, setPage] = useState(0);
  const [memo, setMemo] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(readFilters(params));
    const articleId = Number(params.get("article"));
    if (articleId) setSelectedId(articleId);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.period !== DEFAULT_FILTERS.period) params.set("period", filters.period);
    if (filters.sources.length) params.set("source", filters.sources.join(","));
    if (filters.agendas.length) params.set("agenda", filters.agendas.join(","));
    if (filters.regions.length) params.set("region", filters.regions.join(","));
    if (filters.minScore !== DEFAULT_FILTERS.minScore)
      params.set("minScore", String(filters.minScore));
    if (filters.q) params.set("q", filters.q);
    if (selectedId) params.set("article", String(selectedId));
    window.history.replaceState(
      null,
      "",
      params.toString() ? `?${params.toString()}` : "/explorer",
    );
  }, [filters, selectedId]);

  const query = useMemo(
    () => ({
      from: periodStart(filters.period),
      min_score: filters.minScore,
      region: filters.regions[0],
      agenda: filters.agendas[0],
      q: filters.q || undefined,
      limit: 100,
      offset: 0,
    }),
    [filters],
  );

  const articlesQuery = useArticles(query);
  const detailQuery = useArticle(selectedId);
  const similarQuery = useSimilarArticles(selectedId, 5);
  const bookmarkMutation = useCreateBookmark();

  const filteredArticles = useMemo(() => {
    const rows = (articlesQuery.data?.data ?? []).filter((article) => {
      if (
        filters.sources.length &&
        !filters.sources.some((source) => article.source_name.includes(source))
      )
        return false;
      if (
        filters.agendas.length &&
        !filters.agendas.some((agenda) => articleMatchesAgenda(article, agenda))
      )
        return false;
      if (
        filters.regions.length &&
        !filters.regions.some((region) => articleMatchesRegion(article, region))
      )
        return false;
      return true;
    });
    return rows.sort((a, b) => {
      if (sort === "published")
        return dayjs(b.published_at_kst).valueOf() - dayjs(a.published_at_kst).valueOf();
      return b.relevance_score - a.relevance_score;
    });
  }, [articlesQuery.data?.data, filters.agendas, filters.regions, filters.sources, sort]);

  useEffect(() => {
    if (!selectedId && filteredArticles[0]) setSelectedId(filteredArticles[0].id);
  }, [filteredArticles, selectedId]);

  const selectedIndex = filteredArticles.findIndex((article) => article.id === selectedId);
  const pageRows = filteredArticles.slice(page * 20, page * 20 + 20);
  const selectedArticle = detailQuery.data?.data;

  const saveBookmark = useCallback(
    (articleId?: number, note?: string) => {
      if (!articleId) return;
      bookmarkMutation.mutate(
        { article_id: articleId, note },
        {
          onSuccess: () => toast.success("북마크를 저장했습니다."),
          onError: () => toast.error("북마크 저장에 실패했습니다."),
        },
      );
    },
    [bookmarkMutation],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "j" && !isTyping) {
        event.preventDefault();
        const next = filteredArticles[Math.min(selectedIndex + 1, filteredArticles.length - 1)];
        if (next) setSelectedId(next.id);
      }
      if (event.key === "k" && !isTyping) {
        event.preventDefault();
        const previous = filteredArticles[Math.max(selectedIndex - 1, 0)];
        if (previous) setSelectedId(previous.id);
      }
      if (event.key === "b" && !isTyping) {
        event.preventDefault();
        saveBookmark(selectedId, memo);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredArticles, memo, saveBookmark, selectedId, selectedIndex]);

  const filterPanel = (
    <FilterPanel
      filters={filters}
      setFilters={(next) => {
        setPage(0);
        setFilters(next);
      }}
      searchRef={searchRef}
    />
  );

  const resultsPanel = (
    <ResultsPanel
      articles={pageRows}
      total={filteredArticles.length}
      loading={articlesQuery.isLoading}
      page={page}
      setPage={setPage}
      sort={sort}
      setSort={setSort}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      selectedRows={selectedRows}
      setSelectedRows={setSelectedRows}
      onBookmark={(ids) => ids.forEach((id) => saveBookmark(id))}
    />
  );

  const detailPanel = (
    <DetailPanel
      article={selectedArticle}
      loading={detailQuery.isLoading}
      similar={similarQuery.data?.data ?? []}
      memo={memo}
      setMemo={setMemo}
      onBookmark={() => saveBookmark(selectedId, memo)}
    />
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">이슈 익스플로러</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          기사, 정책영역, 지역 단서를 함께 걸러 오늘의 현안을 추적합니다.
        </p>
      </div>

      <div className="hidden gap-4 xl:grid xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        {filterPanel}
        {resultsPanel}
        {detailPanel}
      </div>

      <Tabs defaultValue="results" className="xl:hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filters">필터</TabsTrigger>
          <TabsTrigger value="results">결과</TabsTrigger>
          <TabsTrigger value="detail">상세</TabsTrigger>
        </TabsList>
        <TabsContent value="filters" className="mt-4">
          {filterPanel}
        </TabsContent>
        <TabsContent value="results" className="mt-4">
          {resultsPanel}
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {detailPanel}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
  searchRef,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const [regionSearch, setRegionSearch] = useState("");
  const visibleRegions = REGIONS.filter((region) => region.includes(regionSearch));

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>필터</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">기간</p>
          <PeriodSelector
            value={filters.period}
            onChange={(period) => setFilters({ ...filters, period })}
          />
        </div>

        <Checklist
          title="출처"
          items={SOURCES}
          values={filters.sources}
          onChange={(sources) => setFilters({ ...filters, sources })}
        />

        <Checklist
          title="정책영역"
          items={AGENDAS}
          values={filters.agendas}
          onChange={(agendas) => setFilters({ ...filters, agendas })}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">지역</p>
          <Input
            value={regionSearch}
            onChange={(event) => setRegionSearch(event.target.value)}
            placeholder="지역 검색"
          />
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
            {visibleRegions.map((region) => (
              <label
                key={region}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={filters.regions.includes(region)}
                  onChange={() =>
                    setFilters({ ...filters, regions: toggleValue(filters.regions, region) })
                  }
                />
                {region}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">점수 임계값</p>
            <Badge variant="outline">{filters.minScore}점</Badge>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.minScore}
            onChange={(event) => setFilters({ ...filters, minScore: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">키워드</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              placeholder="검색어 입력"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setFilters(DEFAULT_FILTERS)}>
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("공유 URL을 복사했습니다.");
            }}
          >
            <Share2 className="h-4 w-4" />
            URL 공유
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsPanel({
  articles,
  total,
  loading,
  page,
  setPage,
  sort,
  setSort,
  selectedId,
  setSelectedId,
  selectedRows,
  setSelectedRows,
  onBookmark,
}: {
  articles: Article[];
  total: number;
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  sort: "score" | "published" | "relevance";
  setSort: (sort: "score" | "published" | "relevance") => void;
  selectedId?: number;
  setSelectedId: (id: number) => void;
  selectedRows: Set<number>;
  setSelectedRows: (rows: Set<number>) => void;
  onBookmark: (ids: number[]) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const allSelected =
    articles.length > 0 && articles.every((article) => selectedRows.has(article.id));

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>검색 결과</CardTitle>
          <Badge variant="outline">총 {total.toLocaleString()}건</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sort === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("score")}
          >
            점수↓
          </Button>
          <Button
            variant={sort === "published" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("published")}
          >
            발행시각↓
          </Button>
          <Button
            variant={sort === "relevance" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("relevance")}
          >
            관련성↓
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedRows.size === 0}
            onClick={() => onBookmark(Array.from(selectedRows))}
          >
            <Bookmark className="h-4 w-4" />
            선택 북마크
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[560px] w-full" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        const next = new Set(selectedRows);
                        articles.forEach((article) =>
                          allSelected ? next.delete(article.id) : next.add(article.id),
                        );
                        setSelectedRows(next);
                      }}
                    />
                  </TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-28">점수</TableHead>
                  <TableHead className="w-24">출처</TableHead>
                  <TableHead className="w-32">영역</TableHead>
                  <TableHead className="w-32">지역</TableHead>
                  <TableHead className="w-36">발행시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow
                    key={article.id}
                    className={article.id === selectedId ? "bg-muted/70" : "cursor-pointer"}
                    onClick={() => setSelectedId(article.id)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(article.id)}
                        onChange={() => {
                          const next = new Set(selectedRows);
                          if (next.has(article.id)) next.delete(article.id);
                          else next.add(article.id);
                          setSelectedRows(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 font-medium">{article.title}</p>
                    </TableCell>
                    <TableCell>
                      <ScoreBar score={article.relevance_score} compact />
                    </TableCell>
                    <TableCell>{article.source_name}</TableCell>
                    <TableCell>
                      <ChipList values={getAgendas(article).slice(0, 2)} />
                    </TableCell>
                    <TableCell>
                      <ChipList values={getPlaces(article).slice(0, 2)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateKST(article.published_at_kst)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {page + 1} / {pageCount} 페이지
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(Math.max(0, page - 1))}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DetailPanel({
  article,
  loading,
  similar,
  memo,
  setMemo,
  onBookmark,
}: {
  article?: ArticleDetail;
  loading: boolean;
  similar: Article[];
  memo: string;
  setMemo: (memo: string) => void;
  onBookmark: () => void;
}) {
  const terms = useMemo(() => (article ? collectTerms(article) : []), [article]);
  const bodyParts = highlightTerms(article?.body || "본문이 아직 수집되지 않았습니다.", terms);
  const subscores = extractSubscores(article);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>상세 분석</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-[720px] w-full" />
        ) : article ? (
          <>
            <div className="space-y-2">
              <h2 className="text-base font-semibold leading-6">{article.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{article.source_name}</Badge>
                <span>{formatDateKST(article.published_at_kst)}</span>
              </div>
            </div>

            <ScoreBar score={article.relevance_score} />
            <div className="grid gap-2">
              {subscores.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.label}</span>
                    <span>{Math.round(item.value)}점</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, item.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Card className="border-dashed shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">3문장 요약</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm leading-6 text-muted-foreground">
                {article.summary || "요약이 준비 중입니다."}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium">사전 단어 하이라이트</p>
              <div className="max-h-72 overflow-y-auto rounded-md border p-3 text-sm leading-7">
                {bodyParts.map((part, index) => (
                  <span
                    key={`${part.text}-${index}`}
                    className={
                      part.highlighted
                        ? "rounded bg-amber-200 px-1 text-amber-950 dark:bg-amber-300"
                        : undefined
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">NER 결과</p>
              <EntityGroup
                label="인물"
                values={article.entities.PERSON?.map((item) => item.term) ?? []}
              />
              <EntityGroup
                label="기관"
                values={article.entities.INSTITUTION?.map((item) => item.term) ?? []}
              />
              <EntityGroup
                label="지명"
                values={article.entities.PLACE?.map((item) => item.term) ?? []}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">유사 기사 Top 5</p>
              <div className="grid gap-2">
                {similar.slice(0, 5).map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/explorer?article=${item.id}`}
                    className="grid grid-cols-[42px_1fr] gap-3 rounded-md border p-2 hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(item.relevance_score)}점
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">북마크 메모</p>
              <textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                className="min-h-20 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="메모를 입력하세요"
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={onBookmark}>
                  <Bookmark className="h-4 w-4" />
                  북마크
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={article.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    원문
                  </a>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            좌측 목록에서 기사를 선택하면 상세 분석이 표시됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Checklist({
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
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-1">
        {items.map((item) => (
          <label
            key={item}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={values.includes(item)}
              onChange={() => onChange(toggleValue(values, item))}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}

function ChipList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.length ? (
        values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
          </Badge>
        ))
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      )}
    </div>
  );
}

function EntityGroup({ label, values }: { label: string; values: string[] }) {
  const unique = Array.from(new Set(values)).slice(0, 12);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ChipList values={unique} />
    </div>
  );
}

function readFilters(params: URLSearchParams): Filters {
  return {
    period: (params.get("period") as Period) || DEFAULT_FILTERS.period,
    sources: splitParam(params.get("source")),
    agendas: splitParam(params.get("agenda")),
    regions: splitParam(params.get("region")),
    minScore: Number(params.get("minScore") || DEFAULT_FILTERS.minScore),
    q: params.get("q") || "",
  };
}

function splitParam(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function periodStart(period: Period) {
  const days: Record<Period, number> = { today: 0, "7d": 7, "14d": 14, "30d": 30 };
  return dayjs().subtract(days[period], "day").format("YYYY-MM-DD");
}

function articleMatchesAgenda(article: Article, agenda: string) {
  return (
    getAgendas(article).some((value) => value.includes(agenda)) || article.category.includes(agenda)
  );
}

function articleMatchesRegion(article: Article, region: string) {
  return (
    getPlaces(article).some((value) => value.includes(region)) ||
    `${article.title} ${article.summary ?? ""}`.includes(region)
  );
}

function getAgendas(article: Article) {
  return Array.from(
    new Set(
      [...(article.entities?.AGENDA?.map((entity) => entity.term) ?? []), article.category].filter(
        Boolean,
      ),
    ),
  );
}

function getPlaces(article: Article) {
  return Array.from(new Set(article.entities?.PLACE?.map((entity) => entity.term) ?? []));
}

function collectTerms(article: ArticleDetail) {
  return Object.values(article.entities)
    .flat()
    .map((entity) => entity.term)
    .filter(Boolean);
}

function extractSubscores(article?: ArticleDetail) {
  const detail = article?.relevance_detail ?? {};
  const subscores =
    typeof detail.subscores === "object" && detail.subscores ? detail.subscores : detail;
  const labels: Record<string, string> = {
    place: "지명",
    institution: "기관",
    agenda: "의제",
    person: "인물",
    embedding: "문맥",
  };

  return Object.entries(subscores as Record<string, unknown>)
    .filter(([, value]) => typeof value === "number")
    .slice(0, 5)
    .map(([key, value]) => ({
      label: labels[key.replace("_score", "")] ?? key,
      value: Number(value) > 1 ? Number(value) : Number(value) * 100,
    }));
}
