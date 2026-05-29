"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ArticleDetailPanel } from "@/components/domain/explorer/ArticleDetailPanel";
import { FilterPanel } from "@/components/domain/explorer/FilterPanel";
import { ResultsList } from "@/components/domain/explorer/ResultsList";
import { ShortcutHelp } from "@/components/domain/explorer/ShortcutHelp";
import { defaultDateRange } from "@/components/domain/explorer/constants";
import {
  matchesAgenda,
  matchesRegion,
  matchesSource,
  sortArticles,
} from "@/components/domain/explorer/utils";
import { useExplorerHotkeys } from "@/components/domain/explorer/useExplorerHotkeys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getArticles } from "@/lib/api/endpoints";
import { useArticles, useCreateBookmark } from "@/lib/hooks/use-api";
import { filterDefaults, type ExplorerSort, useFilterStore } from "@/lib/stores/filter-store";
import type { Period } from "@/types/api";

const PAGE_SIZE = 20;

const queryParsers = {
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  sources: parseAsArrayOf(parseAsString, ",").withDefault([]),
  agendas: parseAsArrayOf(parseAsString, ",").withDefault([]),
  regions: parseAsArrayOf(parseAsString, ",").withDefault([]),
  min_score: parseAsInteger.withDefault(filterDefaults.minScore),
  q: parseAsString.withDefault(""),
  sort: parseAsStringEnum<ExplorerSort>([
    "score_desc",
    "published_desc",
    "published_asc",
    "relevance_desc",
  ]).withDefault(filterDefaults.sort),
  period: parseAsStringEnum<Period>(["today", "7d", "14d", "30d"]).withDefault(
    filterDefaults.period,
  ),
  article_id: parseAsInteger,
};

export default function ExplorerPage() {
  const [queryState, setQueryState] = useQueryStates(queryParsers, {
    history: "replace",
    shallow: true,
  });
  const filter = useFilterStore();
  const queryClient = useQueryClient();
  const bookmarkMutation = useCreateBookmark();
  const searchRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [shortcutOpen, setShortcutOpen] = useState(false);

  useEffect(() => {
    const fallbackRange = defaultDateRange(queryState.period);
    filter.setPeriod(queryState.period);
    filter.setDateRange(queryState.from || fallbackRange.from, queryState.to || fallbackRange.to);
    filter.setSources(queryState.sources);
    filter.setAgendas(queryState.agendas);
    filter.setRegions(queryState.regions);
    filter.setMinScore(queryState.min_score);
    filter.setQuery(queryState.q);
    filter.setSort(queryState.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncFiltersToUrl = useCallback(() => {
    setPage(0);
    const state = useFilterStore.getState();
    void setQueryState({
      period: state.period,
      from: state.from,
      to: state.to,
      sources: state.sources,
      agendas: state.agendas,
      regions: state.regions,
      min_score: state.minScore,
      q: state.q,
      sort: state.sort,
    });
  }, [setQueryState]);

  const articleQueryParams = useMemo(() => filter.toArticleQuery(), [filter]);
  const articlesQuery = useArticles(articleQueryParams);

  const filteredArticles = useMemo(() => {
    const sourceRows = articlesQuery.data?.data ?? [];
    return sortArticles(
      sourceRows.filter(
        (article) =>
          matchesSource(article, filter.sources) &&
          matchesAgenda(article, filter.agendas) &&
          matchesRegion(article, filter.regions),
      ),
      filter.sort,
    );
  }, [articlesQuery.data?.data, filter.agendas, filter.regions, filter.sort, filter.sources]);

  const pageRows = useMemo(
    () => filteredArticles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredArticles, page],
  );

  useEffect(() => {
    const nextOffset = (page + 1) * PAGE_SIZE;
    if (nextOffset < filteredArticles.length) {
      void queryClient.prefetchQuery({
        queryKey: ["articles", { ...articleQueryParams, offset: nextOffset, limit: PAGE_SIZE }],
        queryFn: () => getArticles({ ...articleQueryParams, offset: nextOffset, limit: PAGE_SIZE }),
      });
    }
  }, [articleQueryParams, filteredArticles.length, page, queryClient]);

  const selectedId = queryState.article_id ?? undefined;

  const selectArticle = useCallback(
    (id: number) => {
      void setQueryState({ article_id: id });
    },
    [setQueryState],
  );

  const closeDetail = useCallback(() => {
    void setQueryState({ article_id: null });
  }, [setQueryState]);

  const toggleRow = useCallback((id: number) => {
    setSelectedRows((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback((ids: number[], checked: boolean) => {
    setSelectedRows((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, []);

  const bookmarkArticles = useCallback(
    (ids: number[]) => {
      ids.forEach((id) => {
        bookmarkMutation.mutate(
          { article_id: id },
          {
            onSuccess: () => toast.success("북마크를 저장했습니다."),
            onError: () => toast.error("북마크 저장에 실패했습니다."),
          },
        );
      });
    },
    [bookmarkMutation],
  );

  useExplorerHotkeys({
    searchRef,
    articles: filteredArticles,
    selectedId,
    onSelectArticle: selectArticle,
    onBookmark: bookmarkArticles,
    onCloseDetail: closeDetail,
    onOpenHelp: () => setShortcutOpen(true),
  });

  const appliedFilterCount =
    filter.sources.length +
    filter.agendas.length +
    filter.regions.length +
    (filter.q ? 1 : 0) +
    (filter.minScore !== filterDefaults.minScore ? 1 : 0);

  const filterPanel = <FilterPanel searchRef={searchRef} onChanged={syncFiltersToUrl} />;
  const resultsList = (
    <ResultsList
      articles={pageRows}
      total={filteredArticles.length}
      appliedFilterCount={appliedFilterCount}
      loading={articlesQuery.isLoading || articlesQuery.isFetching}
      error={articlesQuery.error}
      selectedId={selectedId}
      selectedRows={selectedRows}
      page={page}
      pageSize={PAGE_SIZE}
      onSelectArticle={selectArticle}
      onToggleRow={toggleRow}
      onTogglePage={togglePage}
      onBookmark={bookmarkArticles}
      onPageChange={setPage}
      onFilterChanged={syncFiltersToUrl}
    />
  );
  const detailPanel = (
    <ArticleDetailPanel
      articleId={selectedId}
      onSelectArticle={selectArticle}
      onClose={closeDetail}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">이슈 익스플로러</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전국 정책 현안을 모두 분류하고, 광주·전남 관련 이슈는 별도 우선순위로 추적합니다.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShortcutOpen(true)}>
          단축키
        </Button>
      </div>

      <div className="hidden gap-4 xl:grid xl:grid-cols-[280px_minmax(0,1fr)_420px]">
        {filterPanel}
        {resultsList}
        {detailPanel}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,1fr)_380px] xl:hidden">
        <div className="space-y-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                필터 열기
              </Button>
            </DialogTrigger>
            <DialogContent className="right-0 top-0 h-dvh w-[360px] max-w-[92vw] translate-x-0 translate-y-0 overflow-y-auto rounded-none">
              <DialogHeader>
                <DialogTitle>필터</DialogTitle>
              </DialogHeader>
              {filterPanel}
            </DialogContent>
          </Dialog>
          {resultsList}
        </div>
        {detailPanel}
      </div>

      <Tabs defaultValue="list" className="md:hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filters">필터</TabsTrigger>
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="detail">상세</TabsTrigger>
        </TabsList>
        <TabsContent value="filters" className="mt-4">
          {filterPanel}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          {resultsList}
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {detailPanel}
        </TabsContent>
      </Tabs>

      <ShortcutHelp open={shortcutOpen} onOpenChange={setShortcutOpen} />
    </div>
  );
}
