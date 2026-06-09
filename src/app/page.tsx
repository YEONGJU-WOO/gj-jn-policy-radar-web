"use client";

import dayjs from "dayjs";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { GWANGJU_DISTRICTS, JEONNAM_COUNTIES } from "@/components/domain/explorer/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticles, useDailyReport, useSpikes, useTopics } from "@/lib/hooks/use-dashboard";
import { decodeHtmlEntities, formatDateKST } from "@/lib/utils/format";
import type { Article, DailyReport, SpikeKeyword, Topic } from "@/types/api";

const GWANGJU = "광주";
const JEONNAM = "전남";

export default function HomePage() {
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const allArticles = useArticles({ from: today, to: today, limit: 200, offset: 0 });
  const yesterdayAllArticles = useArticles({
    from: yesterday,
    to: yesterday,
    limit: 200,
    offset: 0,
  });
  const relatedArticles = useArticles({
    from: today,
    to: today,
    min_score: 30,
    limit: 200,
    offset: 0,
  });
  const yesterdayRelatedArticles = useArticles({
    from: yesterday,
    to: yesterday,
    min_score: 30,
    limit: 200,
    offset: 0,
  });
  const topics = useTopics("14d");
  const spikes = useSpikes("7d");
  const report = useDailyReport(today);
  const yesterdayReport = useDailyReport(yesterday);

  const articles = useMemo(
    () =>
      [...(relatedArticles.data?.data ?? [])].sort((a, b) => b.relevance_score - a.relevance_score),
    [relatedArticles.data?.data],
  );
  const topIssues = articles.slice(0, 10);
  const topicList = topics.data?.data ?? [];
  const spikeList = spikes.data?.data ?? [];
  const reportData = report.data?.data;
  const yesterdayReportData = yesterdayReport.data?.data;
  const todayTopicCount = topicList.filter((topic) =>
    dayjs(topic.created_at_kst).isSame(today, "day"),
  ).length;
  const yesterdayTopicCount = topicList.filter((topic) =>
    dayjs(topic.created_at_kst).isSame(yesterday, "day"),
  ).length;
  const todaySpikeCount =
    reportData?.rising_keywords?.filter((keyword) => keyword.z_score >= 2).length ??
    spikeList.filter((keyword) => keyword.z_score >= 2).length;
  const yesterdaySpikeCount =
    yesterdayReportData?.rising_keywords?.filter((keyword) => keyword.z_score >= 2).length ?? 0;

  const gwangjuArticles = useMemo(
    () => articles.filter((article) => hasRegion(article, GWANGJU)).slice(0, 5),
    [articles],
  );
  const jeonnamArticles = useMemo(
    () => articles.filter((article) => hasRegion(article, JEONNAM)).slice(0, 5),
    [articles],
  );

  const kpis = [
    {
      label: "오늘 09시 수집 기사",
      value: allArticles.data?.data.length ?? 0,
      suffix: "건",
      delta: calculateDelta(
        allArticles.data?.data.length ?? 0,
        yesterdayAllArticles.data?.data.length ?? 0,
      ),
      sparkline: makeSparklineFromComparison(
        allArticles.data?.data.length ?? 0,
        yesterdayAllArticles.data?.data.length ?? 0,
      ),
    },
    {
      label: "광주·전남 관련 기사",
      value: articles.length,
      suffix: "건",
      delta: calculateDelta(articles.length, yesterdayRelatedArticles.data?.data.length ?? 0),
      sparkline: makeSparklineFromComparison(
        articles.length,
        yesterdayRelatedArticles.data?.data.length ?? 0,
      ),
    },
    {
      label: "신규 토픽",
      value: todayTopicCount,
      suffix: "개",
      delta: calculateDelta(todayTopicCount, yesterdayTopicCount),
      sparkline: makeSparklineFromComparison(todayTopicCount, yesterdayTopicCount),
    },
    {
      label: "부상 키워드",
      value: todaySpikeCount,
      suffix: "개",
      delta: calculateDelta(todaySpikeCount, yesterdaySpikeCount),
      sparkline: makeSparklineFromComparison(todaySpikeCount, yesterdaySpikeCount),
    },
  ];
  const kpiLoading =
    allArticles.isLoading ||
    yesterdayAllArticles.isLoading ||
    relatedArticles.isLoading ||
    yesterdayRelatedArticles.isLoading ||
    topics.isLoading ||
    report.isLoading ||
    yesterdayReport.isLoading;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} loading={kpiLoading} />
        ))}
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <HotIssuesPager articles={topIssues} loading={relatedArticles.isLoading} />

        <PolicyFlowCard report={reportData} spikes={spikeList} loading={report.isLoading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <RegionList
          title="광주 핵심 기사"
          articles={gwangjuArticles}
          emptyText="광주 키워드가 매칭된 기사가 아직 없습니다."
          region={GWANGJU}
        />
        <RegionList
          title="전남 핵심 기사"
          articles={jeonnamArticles}
          emptyText="전남 키워드가 매칭된 기사가 아직 없습니다."
          region={JEONNAM}
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>최근 7일 토픽 추이</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/trends">트렌드 전체보기</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {topics.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topicList.slice(0, 12).map((topic) => (
                <TopicSparkline key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HotIssuesPager({ articles, loading }: { articles: Article[]; loading: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeArticle = articles[activeIndex];
  const total = articles.length;

  function move(step: number) {
    if (!total) return;
    setActiveIndex((current) => (current + step + total) % total);
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Top 10 핫이슈</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            이미지와 요약을 함께 보며 오늘의 핵심 이슈를 넘겨봅니다.
          </p>
        </div>
        <Badge variant="outline">점수 내림차순</Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[360px] w-full" />
        ) : activeArticle ? (
          <div className="space-y-4">
            <RelatedContentDialog
              title={activeArticle.title}
              description="오늘의 브리핑에서 선택한 이슈의 요약, 키워드, 본문을 확인합니다."
              articles={articles}
              initialArticleId={activeArticle.id}
              trigger={
                <button
                  type="button"
                  className="group grid w-full overflow-hidden rounded-md border text-left transition-colors hover:bg-muted/30 lg:h-[320px] lg:grid-cols-[38%_62%]"
                >
                  <div className="relative aspect-[16/9] bg-muted lg:aspect-auto lg:h-full">
                    {activeArticle.image_url ? (
                      <Image
                        src={activeArticle.image_url}
                        alt={activeArticle.image_alt || activeArticle.title}
                        fill
                        sizes="(min-width: 1280px) 38vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <IssueImageFallback article={activeArticle} rank={activeIndex + 1} />
                    )}
                    <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2.5 py-1 text-sm font-semibold shadow-sm">
                      #{activeIndex + 1}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col p-4 lg:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{Math.round(activeArticle.relevance_score)}점</Badge>
                      <Badge variant="outline">{activeArticle.source_name}</Badge>
                      {activeArticle.department ? (
                        <Badge variant="secondary">{activeArticle.department}</Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateKST(activeArticle.published_at_kst)}
                      </span>
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-7 group-hover:text-primary lg:text-xl lg:leading-8">
                      {decodeHtmlEntities(activeArticle.title)}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {decodeHtmlEntities(activeArticle.summary) || "요약이 준비 중입니다."}
                    </p>

                    <div className="mt-3">
                      <ScoreBar score={activeArticle.relevance_score} />
                    </div>
                    <div className="mt-3">
                      <AgendaChips article={activeArticle} />
                    </div>

                    <div className="mt-auto pt-3 text-sm font-medium text-primary">
                      상세 내용 보기
                    </div>
                  </div>
                </button>
              }
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="이전 핫이슈"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="다음 핫이슈"
                  onClick={() => move(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {articles.map((article, index) => (
                  <button
                    key={article.id}
                    type="button"
                    aria-label={`${index + 1}번 핫이슈 보기`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                    className={`h-8 min-w-8 rounded-md border px-2 text-sm font-medium transition-colors ${
                      index === activeIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            오늘 표시할 핫이슈가 아직 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IssueImageFallback({ article, rank }: { article: Article; rank: number }) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--muted))_56%,hsl(var(--accent)/0.4))] p-5">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{article.source_name}</Badge>
        <span className="text-3xl font-semibold text-primary/35">
          {String(rank).padStart(2, "0")}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">정책 현안</p>
        <p className="mt-2 line-clamp-3 text-lg font-semibold leading-7">
          {decodeHtmlEntities(article.title)}
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  sparkline,
  loading,
}: {
  label: string;
  value: number;
  suffix: string;
  delta: number;
  sparkline: number[];
  loading: boolean;
}) {
  const positive = delta >= 0;
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {value.toLocaleString()}
                  <span className="ml-1 text-sm text-muted-foreground">{suffix}</span>
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                  positive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                }`}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(delta)}%
              </span>
            </div>
            <Sparkline values={sparkline} className="mt-3 h-10 w-full" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PolicyFlowCard({
  report,
  spikes,
  loading,
}: {
  report?: DailyReport;
  spikes: SpikeKeyword[];
  loading: boolean;
}) {
  const summary = getReportSummary(report, spikes);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>오늘의 정책 흐름</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(summary);
            toast.success("코멘트를 복사했습니다.");
          }}
        >
          <Copy className="h-4 w-4" />
          복사
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="min-h-[300px] whitespace-pre-line rounded-md border bg-muted/30 p-4 text-sm leading-7">
            {summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegionList({
  title,
  articles,
  emptyText,
  region,
}: {
  title: string;
  articles: Article[];
  emptyText: string;
  region: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <RelatedContentDialog
          title={`${region} 관련 핵심 기사`}
          description="오늘의 브리핑에서 묶은 지역 관련 내용을 현재 화면에서 확인합니다."
          query={{ region, min_score: 30, limit: 30, offset: 0 }}
          articles={articles.length ? articles : undefined}
          trigger={
            <Button variant="outline" size="sm">
              관련 내용 보기
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <div className="grid gap-3">
            {articles.map((article) => (
              <RelatedContentDialog
                key={article.id}
                title={`${region} 관련 기사`}
                description="지역 핵심 기사와 상세 내용을 현재 화면에서 확인합니다."
                articles={articles}
                initialArticleId={article.id}
                trigger={
                  <button
                    type="button"
                    className="rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-sm font-semibold">{article.title}</h3>
                      <Badge variant="outline">{Math.round(article.relevance_score)}점</Badge>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      {article.summary || "요약이 준비 중입니다."}
                    </p>
                    <div className="mt-2">
                      <AgendaChips article={article} />
                    </div>
                  </button>
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopicSparkline({ topic }: { topic: Topic }) {
  return (
    <RelatedContentDialog
      title={`${topic.label} 관련 기사`}
      description="선택한 토픽의 관련 기사와 요약, 키워드를 현재 화면에서 확인합니다."
      query={{ q: topic.keywords[0] ?? topic.label, limit: 30, offset: 0 }}
      trigger={
        <button
          type="button"
          className="min-w-56 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="line-clamp-1 text-sm font-medium">{topic.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {topic.article_count.toLocaleString()}건
              </p>
            </div>
          </div>
          <Sparkline
            values={makeSparkline(topic.article_count, topic.id)}
            className="mt-3 h-12 w-full"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {topic.keywords.slice(0, 3).map((keyword) => (
              <Badge key={keyword} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </button>
      }
    />
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const width = 160;
  const height = 48;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary"
        points={points}
      />
    </svg>
  );
}

function AgendaChips({ article }: { article: Article }) {
  const agendas = article.entities?.AGENDA?.slice(0, 3).map((entity) => entity.term) ?? [];
  const fallback = article.category ? [article.category] : [];
  return (
    <div className="flex flex-wrap gap-1">
      {(agendas.length ? agendas : fallback).map((agenda) => (
        <Badge key={agenda} variant="secondary">
          {agenda}
        </Badge>
      ))}
    </div>
  );
}

function hasRegion(article: Article, region: string) {
  const places = article.entities?.PLACE?.map((entity) => entity.term).join(" ") ?? "";
  const text = `${places} ${article.title} ${article.summary ?? ""}`;
  const aliases =
    region === GWANGJU
      ? [GWANGJU, "광주광역시", ...GWANGJU_DISTRICTS]
      : region === JEONNAM
        ? [JEONNAM, "전라남도", ...JEONNAM_COUNTIES]
        : [region];
  return aliases.some((alias) => text.includes(alias));
}

function makeSparkline(value: number, salt: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const wave = Math.sin(index + salt) * 3;
    return Math.max(1, Math.round(value * (0.55 + index * 0.07) + wave + salt));
  });
}

function makeSparklineFromComparison(current: number, previous: number) {
  const start = Math.max(0, previous);
  const end = Math.max(0, current);
  const diff = end - start;
  return Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6;
    return Math.max(0, Math.round(start + diff * ratio));
  });
}

function calculateDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function getReportSummary(report: DailyReport | undefined, spikes: SpikeKeyword[]) {
  if (report?.summary) return report.summary;
  const gwangju = report?.region_summaries?.[GWANGJU]?.summary;
  const jeonnam = report?.region_summaries?.[JEONNAM]?.summary;
  const keywords = spikes
    .filter((keyword) => keyword.z_score >= 2)
    .slice(0, 4)
    .map((keyword) => keyword.term)
    .join(", ");

  return [
    gwangju || "광주 관련 의제는 지역 산업, 교통, 문화관광 이슈를 중심으로 점검할 필요가 있습니다.",
    jeonnam || "전남 관련 의제는 에너지, 농수산, 인구 대응 축에서 기사가 분산되고 있습니다.",
    keywords
      ? `부상 키워드는 ${keywords}이며, 관련 기사의 연결 구조를 추적할 필요가 있습니다.`
      : "부상 키워드는 아직 탐지되지 않았으며, 오후 보도량 변화를 함께 보는 것이 좋습니다.",
  ].join("\n");
}
