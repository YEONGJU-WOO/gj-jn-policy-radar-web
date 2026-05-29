"use client";

import { Bell, Bookmark, Clipboard, ExternalLink, Pencil, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { articleTerms, entityValues, relevanceSubscores } from "@/components/domain/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeywordChip } from "@/components/ui/KeywordChip";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArticle, useCreateBookmark, useSimilarArticles } from "@/lib/hooks/use-api";
import { decodeHtmlEntities, formatDateKST, highlightTerms } from "@/lib/utils/format";
import type { ArticleDetail, EntityMatch, SimilarArticle } from "@/types/api";

type ArticleDetailPanelProps = {
  articleId?: number;
  onSelectArticle: (id: number) => void;
  onClose: () => void;
};

export function ArticleDetailPanel({
  articleId,
  onSelectArticle,
  onClose,
}: ArticleDetailPanelProps) {
  const articleQuery = useArticle(articleId);
  const similarQuery = useSimilarArticles(articleId, 5);
  const bookmarkMutation = useCreateBookmark();
  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState("");

  const article = articleQuery.data?.data;
  const terms = useMemo(() => (article ? articleTerms(article) : []), [article]);

  function saveBookmark(note?: string) {
    if (!articleId) return;
    bookmarkMutation.mutate(
      { article_id: articleId, note },
      {
        onSuccess: () => toast.success("북마크를 저장했습니다."),
        onError: () => toast.error("북마크 저장에 실패했습니다."),
      },
    );
  }

  if (!articleId) {
    return (
      <Card role="region" aria-label="기사 상세 패널" className="h-fit">
        <CardContent className="p-6">
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            왼쪽 목록에서 기사를 선택하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="기사 상세 패널" className="h-fit">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>상세 분석</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">기사 본문과 NLP 분석 결과</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="상세 닫기" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {articleQuery.isLoading ? (
          <Skeleton className="h-[720px] w-full" />
        ) : articleQuery.error ? (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            기사를 불러오지 못했습니다.
          </p>
        ) : article ? (
          <>
            <ArticleHeader article={article} onBookmark={() => saveBookmark(memo)} />
            <ScoreCard article={article} terms={terms} />
            <BodyBlock article={article} terms={terms} expanded={expanded} onToggle={setExpanded} />
            <SummaryBlock summary={article.summary} />
            <NerTabs article={article} />
            <SimilarArticles
              articles={similarQuery.data?.data ?? []}
              loading={similarQuery.isLoading}
              onSelectArticle={onSelectArticle}
            />
            <MemoEditor memo={memo} onMemoChange={setMemo} onSave={() => saveBookmark(memo)} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ArticleHeader({
  article,
  onBookmark,
}: {
  article: ArticleDetail;
  onBookmark: () => void;
}) {
  async function copySummary() {
    await navigator.clipboard.writeText(
      `${decodeHtmlEntities(article.title)}\n\n${decodeHtmlEntities(article.summary)}`,
    );
    toast.success("기사 요약을 복사했습니다.");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold leading-6">{decodeHtmlEntities(article.title)}</h2>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{article.publisher || article.source_name}</Badge>
        <Badge
          variant={article.classification?.is_gwangju_jeonnam_priority ? "default" : "secondary"}
        >
          {article.classification?.is_gwangju_jeonnam_priority ? "광주·전남 중점" : "전국 분류"}
        </Badge>
        <span>{formatDateKST(article.published_at_kst)}</span>
        <Button asChild type="button" variant="ghost" size="sm">
          <a href={article.url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            원문 열기
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onBookmark}>
          <Star className="h-4 w-4" />
          북마크
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast.info("메모 영역으로 이동하세요.")}
        >
          <Pencil className="h-4 w-4" />
          메모
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copySummary}>
          <Clipboard className="h-4 w-4" />
          복사
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast.info("알림 규칙 화면에서 조건을 저장할 수 있습니다.")}
        >
          <Bell className="h-4 w-4" />
          알림 규칙
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({ article, terms }: { article: ArticleDetail; terms: string[] }) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">총 관련성 점수</p>
            <p className="text-3xl font-semibold">{Math.round(article.relevance_score)}</p>
          </div>
          <div className="w-36">
            <ScoreBar score={article.relevance_score} />
          </div>
        </div>
        <ScoreSubBars article={article} />
        <div className="flex flex-wrap gap-1.5">
          {terms.slice(0, 16).map((term) => (
            <KeywordChip key={term} keyword={term} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScoreSubBars({ article }: { article?: ArticleDetail }) {
  const colors = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];
  const scores = relevanceSubscores(article);
  return (
    <div className="grid gap-2">
      {scores.map((item, index) => (
        <div key={item.key} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{item.label}</span>
            <span>{Math.round(item.value)}점</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${colors[index % colors.length]}`}
              style={{ width: `${Math.min(100, item.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BodyBlock({
  article,
  terms,
  expanded,
  onToggle,
}: {
  article: ArticleDetail;
  terms: string[];
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
}) {
  const body = decodeHtmlEntities(article.body) || "본문이 아직 수집되지 않았습니다.";
  const displayText = expanded || body.length <= 600 ? body : `${body.slice(0, 600)}...`;
  const parts = highlightTerms(displayText, terms);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">본문</p>
      <div className="rounded-md border p-3 text-sm leading-7">
        {parts.map((part, index) => (
          <mark
            key={`${part.text}-${index}`}
            className={
              part.highlighted
                ? "rounded bg-amber-200 px-1 text-amber-950 dark:bg-amber-300"
                : "bg-transparent text-inherit"
            }
          >
            {part.text}
          </mark>
        ))}
      </div>
      {body.length > 600 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onToggle(!expanded)}>
          {expanded ? "접기" : "전체 보기"}
        </Button>
      ) : null}
    </div>
  );
}

function SummaryBlock({ summary }: { summary?: string | null }) {
  return (
    <Card className="border-l-4 border-l-primary shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">3문장 추출 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm leading-6 text-muted-foreground">
        {decodeHtmlEntities(summary) || "요약이 준비 중입니다."}
      </CardContent>
    </Card>
  );
}

export function NerTabs({ article }: { article?: ArticleDetail }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">NER 결과</p>
      <Tabs defaultValue="person">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="person">인물</TabsTrigger>
          <TabsTrigger value="institution">기관</TabsTrigger>
          <TabsTrigger value="place">지명</TabsTrigger>
        </TabsList>
        <TabsContent value="person" className="mt-3">
          <EntityChips values={entityValues(article, "PERSON")} />
        </TabsContent>
        <TabsContent value="institution" className="mt-3">
          <EntityChips values={entityValues(article, "INSTITUTION")} />
        </TabsContent>
        <TabsContent value="place" className="mt-3">
          <EntityChips values={entityValues(article, "PLACE")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntityChips({ values }: { values: EntityMatch[] }) {
  const uniqueTerms = Array.from(new Set(values.map((item) => item.term))).slice(0, 18);
  if (!uniqueTerms.length)
    return <p className="text-sm text-muted-foreground">추출 결과가 없습니다.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {uniqueTerms.map((term) => (
        <KeywordChip key={term} keyword={term} />
      ))}
    </div>
  );
}

export function SimilarArticles({
  articles,
  loading,
  onSelectArticle,
}: {
  articles: SimilarArticle[];
  loading: boolean;
  onSelectArticle: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">유사 기사 Top 5</p>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid gap-2">
          {articles.slice(0, 5).map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="grid grid-cols-[42px_1fr] gap-3 rounded-md border p-2 text-left hover:bg-muted/50"
              onClick={() => onSelectArticle(item.id)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                {index + 1}
              </div>
              <div>
                <p className="line-clamp-2 text-sm font-medium">{decodeHtmlEntities(item.title)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  유사도 {Math.round((item.similarity ?? 0) * 100)}%, 관련성{" "}
                  {Math.round(item.relevance_score)}점
                </p>
              </div>
            </button>
          ))}
          {!articles.length ? (
            <p className="text-sm text-muted-foreground">유사 기사가 없습니다.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MemoEditor({
  memo,
  onMemoChange,
  onSave,
}: {
  memo: string;
  onMemoChange: (memo: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">북마크 메모</p>
      <textarea
        value={memo}
        onChange={(event) => onMemoChange(event.target.value)}
        className="min-h-20 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="메모를 입력하세요"
      />
      <Button type="button" className="w-full" onClick={onSave}>
        <Bookmark className="h-4 w-4" />
        메모 저장
      </Button>
    </div>
  );
}
