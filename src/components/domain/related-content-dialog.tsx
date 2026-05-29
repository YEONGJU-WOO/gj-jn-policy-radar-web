"use client";

import { ExternalLink } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticle, useArticles } from "@/lib/hooks/use-api";
import { decodeHtmlEntities, formatDateKST } from "@/lib/utils/format";
import type { Article, ArticleDetail, ArticleQuery, EntityMatch } from "@/types/api";

type RelatedContentDialogProps = {
  title: string;
  description?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  query?: ArticleQuery;
  articles?: Article[];
  initialArticleId?: number;
};

export function RelatedContentDialog({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  query,
  articles,
  initialArticleId,
}: RelatedContentDialogProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(initialArticleId);
  const fetched = useArticles(query ?? {}, { enabled: !articles && Boolean(query) });
  const rows = useMemo(() => articles ?? fetched.data?.data ?? [], [articles, fetched.data?.data]);
  const activeId = selectedId ?? rows[0]?.id;
  const detail = useArticle(activeId);

  useEffect(() => {
    setSelectedId(initialArticleId);
  }, [initialArticleId, query?.agenda, query?.q, query?.region, open]);

  const content = (
    <DialogContent className="max-h-[88vh] w-[min(96vw,1120px)] max-w-none overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </DialogHeader>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-2">
          {fetched.isLoading ? <Skeleton className="h-96 w-full" /> : null}
          {rows.slice(0, 30).map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelectedId(article.id)}
              className={`w-full rounded-md border p-3 text-left text-sm outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring ${
                activeId === article.id ? "border-primary bg-muted/60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 font-medium">{decodeHtmlEntities(article.title)}</p>
                <Badge variant="outline">{Math.round(article.relevance_score)}점</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {article.publisher || article.source_name} ·{" "}
                {formatDateKST(article.published_at_kst)}
              </p>
            </button>
          ))}
          {!fetched.isLoading && !rows.length ? (
            <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              관련 기사가 없습니다.
            </p>
          ) : null}
        </div>

        <ArticlePreview
          articleId={activeId}
          loading={detail.isLoading}
          detail={detail.data?.data}
        />
      </div>
    </DialogContent>
  );

  if (open !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      {content}
    </Dialog>
  );
}

function ArticlePreview({
  articleId,
  loading,
  detail,
}: {
  articleId?: number;
  loading: boolean;
  detail?: ArticleDetail;
}) {
  if (!articleId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          왼쪽 목록에서 항목을 선택하면 상세 내용이 표시됩니다.
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Skeleton className="h-[620px] w-full" />;

  if (!detail) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          상세 내용을 불러오지 못했습니다.
        </CardContent>
      </Card>
    );
  }

  const summaryParagraphs = buildSummaryParagraphs(detail);
  const keywords = extractKeywords(detail);

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h3 className="text-lg font-semibold leading-7">{decodeHtmlEntities(detail.title)}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.publisher || detail.source_name} · {formatDateKST(detail.published_at_kst)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{Math.round(detail.relevance_score)}점</Badge>
          <Badge
            variant={detail.classification?.is_gwangju_jeonnam_priority ? "default" : "secondary"}
          >
            {detail.classification?.is_gwangju_jeonnam_priority ? "광주·전남 중점" : "전국 분류"}
          </Badge>
          {detail.category ? <Badge variant="outline">{detail.category}</Badge> : null}
        </div>

        <section className="space-y-3 rounded-md border-l-4 border-l-primary bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">요약</h4>
            <div className="flex flex-wrap gap-1">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-3 text-sm leading-7">
            {summaryParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">본문</h4>
          <div className="max-h-[420px] overflow-y-auto rounded-md border p-4 text-sm leading-7">
            {decodeHtmlEntities(detail.body) || "본문이 아직 수집되지 않았습니다."}
          </div>
        </section>

        <Button asChild variant="outline">
          <a href={detail.url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            원문 열기
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function buildSummaryParagraphs(article: ArticleDetail) {
  const summary = decodeHtmlEntities(article.summary);
  const body = decodeHtmlEntities(article.body);
  const source = [summary, body].filter(Boolean).join(" ");
  const sentences = source
    .split(/(?<=[.!?。]|다\.|요\.|니다\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 12);

  const selected = unique(sentences).slice(0, 4);
  if (selected.length) return selected;
  if (summary) return [summary];
  return ["요약을 준비 중입니다. 본문이 수집되면 핵심 흐름을 먼저 보여드립니다."];
}

function extractKeywords(article: ArticleDetail) {
  const entityTerms = Object.values(article.entities ?? {})
    .flat()
    .map((entity: EntityMatch) => entity.term)
    .filter(Boolean);
  const tokens = (article.tokens ?? []).filter(isKeywordLike);
  const titleTerms = decodeHtmlEntities(article.title)
    .split(/[^0-9A-Za-z가-힣]+/)
    .filter(isKeywordLike);

  return unique([...entityTerms, article.category, ...titleTerms, ...tokens])
    .filter(Boolean)
    .slice(0, 5);
}

function isKeywordLike(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  const stopwords = new Set([
    "그리고",
    "그러나",
    "또는",
    "대한",
    "관련",
    "이번",
    "오늘",
    "정부",
    "사업",
    "추진",
    "확대",
    "지원",
    "계획",
  ]);
  return !stopwords.has(trimmed);
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}
