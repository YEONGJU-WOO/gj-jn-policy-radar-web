"use client";

import { Bookmark, ChevronLeft, ChevronRight, Star } from "lucide-react";

import { ActiveFilterChips } from "@/components/domain/explorer/FilterPanelParts";
import { articleAgendas, articleRegions } from "@/components/domain/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decodeHtmlEntities, formatDateKST } from "@/lib/utils/format";
import type { Article } from "@/types/api";

type ResultsListProps = {
  articles: Article[];
  total: number;
  appliedFilterCount: number;
  loading: boolean;
  error?: unknown;
  selectedId?: number;
  selectedRows: Set<number>;
  page: number;
  pageSize: number;
  onSelectArticle: (id: number) => void;
  onToggleRow: (id: number) => void;
  onTogglePage: (ids: number[], checked: boolean) => void;
  onBookmark: (ids: number[]) => void;
  onPageChange: (page: number) => void;
  onFilterChanged?: () => void;
};

export function ResultsList({
  articles,
  total,
  appliedFilterCount,
  loading,
  error,
  selectedId,
  selectedRows,
  page,
  pageSize,
  onSelectArticle,
  onToggleRow,
  onTogglePage,
  onBookmark,
  onPageChange,
  onFilterChanged,
}: ResultsListProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const allSelected =
    articles.length > 0 && articles.every((article) => selectedRows.has(article.id));

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>검색 결과</CardTitle>
          <Badge variant="outline">
            총 {total.toLocaleString()}건 ({appliedFilterCount}개 필터 적용 중)
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActiveFilterChips onChanged={onFilterChanged} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedRows.size === 0}
            onClick={() => onBookmark(Array.from(selectedRows))}
          >
            <Bookmark className="h-4 w-4" />
            선택 항목 북마크
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[560px] w-full" />
        ) : error ? (
          <StateMessage
            title="불러오기 실패"
            description="불러오기 실패. 잠시 후 다시 시도해주세요."
          />
        ) : !articles.length ? (
          <StateMessage title="빈 결과" description="조건에 맞는 기사가 없습니다." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table aria-label="정책 기사 검색 결과">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        aria-label="현재 페이지 전체 선택"
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) =>
                          onTogglePage(
                            articles.map((article) => article.id),
                            event.target.checked,
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-32">점수</TableHead>
                    <TableHead className="w-28">출처</TableHead>
                    <TableHead className="w-36">영역</TableHead>
                    <TableHead className="w-32">지역</TableHead>
                    <TableHead className="w-36">발행시각</TableHead>
                    <TableHead className="w-12">북마크</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow
                      key={article.id}
                      data-testid={`article-row-${article.id}`}
                      className={article.id === selectedId ? "bg-muted/70" : "cursor-pointer"}
                      onClick={() => onSelectArticle(article.id)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          aria-label={`${decodeHtmlEntities(article.title)} 선택`}
                          type="checkbox"
                          checked={selectedRows.has(article.id)}
                          onChange={() => onToggleRow(article.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 font-medium">
                          {decodeHtmlEntities(article.title)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ScoreBar score={article.relevance_score} compact />
                      </TableCell>
                      <TableCell>{article.publisher || article.source_name}</TableCell>
                      <TableCell>
                        <InlineChips values={articleAgendas(article).slice(0, 3)} />
                      </TableCell>
                      <TableCell>
                        <InlineChips values={regionChips(article).slice(0, 3)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateKST(article.published_at_kst)}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${decodeHtmlEntities(article.title)} 북마크`}
                          onClick={() => onBookmark([article.id])}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {page + 1} / {pageCount} 페이지, 페이지당 {pageSize}개
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => onPageChange(Math.max(0, page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount - 1}
                  onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function regionChips(article: Article) {
  const regions = articleRegions(article);
  if (regions.length) return regions;
  if (article.region_scope === "other_region") return ["기타 지역"];
  if (article.region_scope === "national_or_unknown") return ["전국/미분류"];
  return [];
}

function InlineChips({ values }: { values: string[] }) {
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

function StateMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
