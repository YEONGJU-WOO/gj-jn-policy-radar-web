"use client";

import { ExternalLink } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? open : internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const shouldFetch = isOpen && !articles && Boolean(query);
  const articleQuery = useArticles(
    shouldFetch ? { ...query, limit: query?.limit ?? 30, offset: query?.offset ?? 0 } : undefined,
  );

  const rows = useMemo(() => {
    const sourceRows: Article[] = articles ?? articleQuery.data?.data ?? [];
    return sourceRows.slice(0, 30);
  }, [articleQuery.data?.data, articles]);

  const [activeId, setActiveId] = useState<number | undefined>(initialArticleId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveId((current) => {
      if (initialArticleId !== undefined) {
        return initialArticleId;
      }

      if (current !== undefined && rows.some((article) => article.id === current)) {
        return current;
      }

      return rows[0]?.id;
    });
  }, [initialArticleId, isOpen, rows]);

  const detailQuery = useArticle(activeId);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[88vh] w-[min(96vw,1120px)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="overflow-hidden">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">관련 기사</span>
                <span className="text-muted-foreground">{rows.length}건</span>
              </div>

              {articleQuery.isLoading && !articles ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  관련 기사가 없습니다.
                </div>
              ) : (
                <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                  {rows.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setActiveId(article.id)}
                      className={`w-full rounded-md border p-3 text-left transition hover:bg-muted ${
                        activeId === article.id ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="line-clamp-2 text-sm font-medium">
                        {decodeHtmlEntities(article.title)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span>{article.source_name || article.publisher}</span>
                        {article.department ? <span>{article.department}</span> : null}
                        {article.published_at_kst ? (
                          <span>{formatDateKST(article.published_at_kst)}</span>
                        ) : null}
                        {article.relevance_score !== undefined &&
                        article.relevance_score !== null ? (
                          <Badge variant="secondary">{Math.round(article.relevance_score)}점</Badge>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ArticlePreview article={detailQuery.data?.data} loading={detailQuery.isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArticlePreview({ article, loading }: { article?: ArticleDetail; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!article) {
    return (
      <Card>
        <CardContent className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
          왼쪽 목록에서 항목을 선택하면 상세 내용을 표시합니다.
        </CardContent>
      </Card>
    );
  }

  const summaryParagraphs = buildSummaryParagraphs(article);
  const keywords = extractKeywords(article);
  const body = decodeHtmlEntities(article.body ?? "");

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{article.source_name || article.publisher}</Badge>
            {article.department ? <Badge variant="secondary">{article.department}</Badge> : null}
            {article.published_at_kst ? (
              <span>{formatDateKST(article.published_at_kst)}</span>
            ) : null}
            {article.relevance_score !== undefined && article.relevance_score !== null ? (
              <Badge>{Math.round(article.relevance_score)}점</Badge>
            ) : null}
          </div>
          <h2 className="text-xl font-semibold leading-relaxed">
            {decodeHtmlEntities(article.title)}
          </h2>
          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt={article.image_alt ?? `${decodeHtmlEntities(article.title)} 관련 이미지`}
            loading="lazy"
            className="max-h-72 w-full rounded-md border object-cover"
          />
        ) : null}

        <section className="rounded-md border border-primary/25 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold">요약</h3>
          <div className="space-y-3 text-sm leading-7">
            {summaryParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {article.summary ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">추출 요약</h3>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {decodeHtmlEntities(article.summary)}
            </p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">본문</h3>
          <div className="max-h-[42vh] overflow-y-auto rounded-md border bg-background p-4 text-sm leading-7">
            {body ? (
              <p className="whitespace-pre-wrap">{body}</p>
            ) : (
              <p className="text-muted-foreground">본문을 아직 수집하지 못했습니다.</p>
            )}
          </div>
        </section>

        {article.url ? (
          <Button variant="outline" asChild>
            <a href={article.url} target="_blank" rel="noreferrer">
              원문 열기
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildSummaryParagraphs(article: ArticleDetail) {
  const sourceSummary: string[] = decodeHtmlEntities(article.summary ?? "")
    .split(/\n+|(?<=[.!?。])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const bodySentences: string[] = decodeHtmlEntities(article.body ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。])\s+|(?<=다\.)\s+|(?<=요\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);

  const candidates = [...sourceSummary, ...bodySentences];
  const paragraphs = unique(candidates).slice(0, 4);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return ["요약할 수 있는 본문이 아직 충분하지 않습니다."];
}

function extractKeywords(article: ArticleDetail) {
  const entityValues = flattenEntities(article.entities);
  const matchedTerms = matchedTermsFromDetail(article);
  const categoryValues = Array.isArray(article.category) ? article.category : [article.category];
  const titleTerms = decodeHtmlEntities(article.title)
    .split(/[\s,./·ㆍ()[\]{}:;'"“”‘’!?]+/)
    .map((term: string) => term.trim());

  return unique([...entityValues, ...matchedTerms, ...categoryValues, ...titleTerms])
    .filter(isKeywordLike)
    .slice(0, 5);
}

function flattenEntities(entities?: ArticleDetail["entities"]) {
  if (!entities) {
    return [];
  }

  if (Array.isArray(entities)) {
    return entities.map(entityToText).filter(Boolean);
  }

  return Object.values(entities).flat().map(entityToText).filter(Boolean);
}

function entityToText(entity: string | EntityMatch | null | undefined) {
  if (!entity) {
    return "";
  }

  if (typeof entity === "string") {
    return entity;
  }

  return entity.term;
}

function matchedTermsFromDetail(article: ArticleDetail) {
  const detail = article.relevance_detail as
    | { matched_terms?: Record<string, Array<string | EntityMatch>> }
    | undefined;

  return Object.values(detail?.matched_terms ?? {})
    .flat()
    .map(entityToText)
    .filter(Boolean);
}

function isKeywordLike(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  const cleanValue = value.trim();
  if (cleanValue.length < 2 || cleanValue.length > 20) {
    return false;
  }

  const stopwords = new Set([
    "관련",
    "기사",
    "보도",
    "뉴스",
    "정책",
    "이번",
    "오늘",
    "내일",
    "지난",
    "그리고",
    "하지만",
    "또한",
    "대한",
    "위해",
  ]);

  return !stopwords.has(cleanValue);
}

function unique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const cleanValue = value?.trim();
    if (!cleanValue || seen.has(cleanValue)) {
      return;
    }
    seen.add(cleanValue);
    result.push(cleanValue);
  });

  return result;
}
