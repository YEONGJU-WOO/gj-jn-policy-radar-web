"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, FileDown, GripVertical, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_BASE_URL } from "@/lib/api/client";
import { useArticles, useBookmarks, useDailyReport } from "@/lib/hooks/use-dashboard";
import { todayKst } from "@/lib/utils/date";
import type { AlertRuleInput, Article, Bookmark, DailyReport } from "@/types/api";

const alertSchema = z.object({
  name: z.string().min(1, "규칙 이름을 입력하세요."),
  keywords: z.string().min(1, "키워드를 하나 이상 입력하세요."),
  regions: z.string().optional(),
  agendas: z.string().optional(),
  minScore: z.number().min(0).max(100),
  channel: z.enum(["email", "slack", "webhook"]),
  target: z.string().min(1, "발송 대상을 입력하세요."),
  active: z.boolean(),
});

type AlertForm = z.infer<typeof alertSchema>;

export default function ReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [date, setDate] = useState(todayKst());
  const [rules, setRules] = useState<Array<AlertRuleInput & { id: number; last_sent_at: string }>>(
    [],
  );
  const [cards, setCards] = useState<Bookmark[]>([]);
  const report = useDailyReport(date);
  const bookmarks = useBookmarks();
  const articles = useArticles({ limit: 100 });
  const articleMap = useMemo(
    () => new Map((articles.data?.data ?? []).map((article) => [article.id, article])),
    [articles.data?.data],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">리포트 & 알림</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자동 리포트를 확인하고, 알림 규칙과 북마크 이슈카드를 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="report">리포트</TabsTrigger>
          <TabsTrigger value="alerts">알림 규칙</TabsTrigger>
          <TabsTrigger value="cards">이슈카드</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>조회 조건</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">일일</SelectItem>
                    <SelectItem value="weekly">주간</SelectItem>
                    <SelectItem value="monthly">월간</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                <p className="text-xs text-muted-foreground">
                  현재 API는 일일 리포트를 기준으로 조회합니다. 선택한 유형은 미리보기 제목과 복사용
                  요약에 반영됩니다.
                </p>
                <Button asChild className="w-full">
                  <a href={`${API_BASE_URL}/api/reports/daily?date=${date}&format=pdf`}>
                    <FileDown className="h-4 w-4" />
                    PDF 다운로드
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await navigator.clipboard.writeText(toMarkdown(report.data?.data, reportType));
                    toast.success("요약을 클립보드에 복사했습니다.");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  복사용 요약
                </Button>
              </CardContent>
            </Card>
            {report.isLoading ? (
              <Skeleton className="h-[720px] w-full" />
            ) : (
              <ReportPreview report={report.data?.data} reportType={reportType} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>알림 규칙</CardTitle>
              <AlertDialog
                onCreated={(rule) =>
                  setRules((prev) => [{ ...rule, id: Date.now(), last_sent_at: "-" }, ...prev])
                }
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">이름</th>
                      <th className="p-3 text-left">조건 요약</th>
                      <th className="p-3 text-left">채널</th>
                      <th className="p-3 text-left">상태</th>
                      <th className="p-3 text-left">마지막 발송</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b">
                        <td className="p-3 font-medium">{rule.name}</td>
                        <td className="p-3 text-muted-foreground">{summarizeRule(rule)}</td>
                        <td className="p-3">{rule.channel}</td>
                        <td className="p-3">
                          <Badge variant={rule.active ? "default" : "outline"}>
                            {rule.active ? "활성" : "비활성"}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{rule.last_sent_at}</td>
                      </tr>
                    ))}
                    {!rules.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          등록된 알림 규칙이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <IssueBoard
            rows={cards.length ? cards : (bookmarks.data?.data ?? demoBookmarks)}
            articleMap={articleMap}
            onRows={setCards}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportPreview({ report, reportType }: { report?: DailyReport; reportType: string }) {
  if (!report) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          리포트 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{reportTypeLabel(reportType)} 리포트 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {report.summary || "요약 문장이 아직 생성되지 않았습니다."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            생성 시각: {dayjs(report.generated_at_kst).format("YYYY-MM-DD HH:mm")} KST
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="총 기사" value={report.kpi.total_articles} />
        <Kpi label="평균 점수" value={Math.round(report.kpi.average_relevance_score)} />
        <Kpi label="고관련 기사" value={report.kpi.high_relevance_articles} />
        <Kpi label="출처 수" value={report.kpi.source_count} />
      </div>

      <Section title="분야별 브리핑">
        {reportBriefingFields(report).length ? (
          <div className="grid gap-3">
            {reportBriefingFields(report).map((field) => (
              <div key={field.field} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{field.field}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {field.article_count.toLocaleString()}건
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {field.keywords.slice(0, 8).map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 grid gap-4">
                  {field.items.slice(0, 3).map((item) => (
                    <div
                      key={`${field.field}-${item.title}`}
                      className="rounded-md bg-muted/30 p-3"
                    >
                      <p className="text-sm font-semibold leading-6">
                        ({item.subfield}) {item.title}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
                        {item.bullets.slice(0, 4).map((bullet) => (
                          <li key={bullet} className="grid grid-cols-[14px_1fr] gap-2">
                            <span aria-hidden="true">-</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">*출처: {item.source}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            분야별 브리핑이 아직 생성되지 않았습니다.
          </p>
        )}
      </Section>

      <Section title="Top 10 핫이슈">
        {report.top_10_hot_issues?.slice(0, 10).map((article) => (
          <ArticleLine key={article.id} article={article} />
        ))}
      </Section>

      <Section title="영역별 핵심 기사">
        {Object.entries(report.agenda_key_articles ?? {}).map(([agenda, rows]) => (
          <div key={agenda} className="rounded-md border p-3">
            <p className="font-medium">{agenda}</p>
            <div className="mt-2 grid gap-2">
              {rows.slice(0, 3).map((article) => (
                <ArticleLine key={article.id} article={article} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="부상 키워드">
        <div className="flex flex-wrap gap-2">
          {(report.rising_keywords ?? []).map((keyword) => (
            <RelatedContentDialog
              key={keyword.term}
              title={`${keyword.term} 관련 기사`}
              description="부상 키워드와 연결된 기사와 요약을 현재 화면에서 확인합니다."
              query={{ q: keyword.term, limit: 30, offset: 0 }}
              trigger={
                <button type="button" className="rounded-full outline-none focus-visible:ring-2">
                  <Badge variant="secondary">
                    {keyword.term} z={keyword.z_score.toFixed(1)}
                  </Badge>
                </button>
              }
            />
          ))}
        </div>
      </Section>

      <Section title="광주·전남 분리 요약">
        {Object.entries(report.region_summaries ?? {}).map(([region, item]) => (
          <div key={region} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{region}</p>
              <RelatedContentDialog
                title={`${region} 관련 기사`}
                description="지역 요약과 연결된 기사 목록을 현재 화면에서 확인합니다."
                query={{ region, limit: 30, offset: 0 }}
                articles={item.top_articles}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    관련 내용 보기
                  </Button>
                }
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
            <div className="mt-3 grid gap-2">
              {item.top_articles?.slice(0, 3).map((article) => (
                <ArticleLine key={article.id} article={article} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="토픽 클러스터">
        {(report.topic_cluster_summary ?? []).slice(0, 8).map((topic) => (
          <div key={topic.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{topic.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{topic.keywords.join(", ")}</p>
              </div>
              <RelatedContentDialog
                title={`${topic.label} 관련 기사`}
                description="선택한 토픽 클러스터에 포함된 기사와 상세 내용을 확인합니다."
                articles={topic.articles}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    관련 내용 보기
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function AlertDialog({ onCreated }: { onCreated: (rule: AlertRuleInput) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<AlertForm>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      name: "",
      keywords: "",
      regions: "",
      agendas: "",
      minScore: 30,
      channel: "slack",
      target: "",
      active: true,
    },
  });
  const mutation = useMutation({
    mutationFn: async (rule: AlertRuleInput) => {
      const response = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!response.ok) throw new Error("저장 실패");
      return response.json();
    },
    onSuccess: (_, rule) => {
      onCreated(rule);
      toast.success("알림 규칙을 저장했습니다.");
      setOpen(false);
      form.reset();
    },
    onError: () =>
      toast.error("알림 규칙 저장에 실패했습니다. 관리자 로그인과 API 키를 확인해주세요."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />새 규칙 만들기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 알림 규칙</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              name: values.name,
              query: {
                keywords: split(values.keywords),
                regions: split(values.regions),
                agendas: split(values.agendas),
                min_score: values.minScore,
              },
              channel: values.channel,
              target: values.target,
              active: values.active,
            }),
          )}
        >
          <Input placeholder="규칙 이름" {...form.register("name")} />
          <Input placeholder="키워드, 쉼표로 구분" {...form.register("keywords")} />
          <Input placeholder="지역, 쉼표로 구분" {...form.register("regions")} />
          <Input placeholder="영역, 쉼표로 구분" {...form.register("agendas")} />
          <label className="space-y-1 text-sm">
            <span>점수 임계값 {form.watch("minScore")}점</span>
            <input
              type="range"
              min={0}
              max={100}
              className="w-full accent-primary"
              {...form.register("minScore", { valueAsNumber: true })}
            />
          </label>
          <Select
            value={form.watch("channel")}
            onValueChange={(value) =>
              form.setValue("channel", value as AlertForm["channel"], { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">email</SelectItem>
              <SelectItem value="slack">slack</SelectItem>
              <SelectItem value="webhook">webhook</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="target" {...form.register("target")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("active")} />
            활성
          </label>
          <Button type="submit" disabled={mutation.isPending}>
            저장
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IssueBoard({
  rows,
  articleMap,
  onRows,
}: {
  rows: Bookmark[];
  articleMap: Map<number, Article>;
  onRows: (rows: Bookmark[]) => void;
}) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const reorder = (fromId: number, toId: number) => {
    const from = rows.findIndex((row) => row.id === fromId);
    const to = rows.findIndex((row) => row.id === toId);
    if (from < 0 || to < 0) return;
    onRows(arrayMove(rows, from, to));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {["오늘 검토", "부서 공유", "추적 필요"].map((folder, folderIndex) => (
        <Card key={folder}>
          <CardHeader>
            <CardTitle>{folder}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows
              .filter((_, index) => index % 3 === folderIndex)
              .map((bookmark) => (
                <IssueCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  article={articleMap.get(bookmark.article_id)}
                  note={notes[bookmark.id] ?? bookmark.note ?? ""}
                  onNote={(note) => setNotes((prev) => ({ ...prev, [bookmark.id]: note }))}
                  onDropOn={reorder}
                />
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function IssueCard({
  bookmark,
  article,
  note,
  onNote,
  onDropOn,
}: {
  bookmark: Bookmark;
  article?: Article;
  note: string;
  onNote: (note: string) => void;
  onDropOn: (from: number, to: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", String(bookmark.id))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropOn(Number(event.dataTransfer.getData("text/plain")), bookmark.id)}
      className="rounded-md border bg-background p-3"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 h-4 w-4 cursor-grab text-muted-foreground" />
        <RelatedContentDialog
          title={article?.title ?? `북마크 기사 #${bookmark.article_id}`}
          description="북마크한 기사와 관련 내용을 현재 화면에서 확인합니다."
          articles={article ? [article] : undefined}
          initialArticleId={bookmark.article_id}
          query={article ? undefined : { limit: 30, offset: 0 }}
          trigger={
            <button
              type="button"
              className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="line-clamp-2 text-sm font-medium">
                {article?.title ?? `북마크 기사 #${bookmark.article_id}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {article
                  ? `${Math.round(article.relevance_score)}점 · ${article.category}`
                  : "기사 데이터를 불러오는 중"}
              </p>
            </button>
          }
        />
      </div>
      <textarea
        value={note}
        onChange={(event) => onNote(event.target.value)}
        placeholder="메모"
        className="mt-3 min-h-16 w-full rounded-md border bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function ArticleLine({ article }: { article: Article }) {
  return (
    <RelatedContentDialog
      title={article.title}
      description="선택한 기사와 관련 내용을 현재 화면에서 확인합니다."
      articles={[article]}
      initialArticleId={article.id}
      trigger={
        <button
          type="button"
          className="block w-full rounded-md border p-3 text-left text-sm outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="line-clamp-2 font-medium">{article.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {Math.round(article.relevance_score)}점 · {article.source_name}
          </span>
        </button>
      }
    />
  );
}

function split(value?: string) {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function arrayMove<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function summarizeRule(rule: AlertRuleInput) {
  const query = rule.query as {
    keywords?: string[];
    regions?: string[];
    agendas?: string[];
    min_score?: number;
  };
  return [
    `키워드 ${query.keywords?.join("/") || "-"}`,
    query.regions?.length ? `지역 ${query.regions.join("/")}` : "",
    query.agendas?.length ? `영역 ${query.agendas.join("/")}` : "",
    `점수 ${query.min_score ?? 0}+`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function toMarkdown(report?: DailyReport, reportType = "daily") {
  if (!report) return "리포트 데이터가 없습니다.";
  return [
    `# ${reportTypeLabel(reportType)} 정책 리포트 (${dayjs(report.generated_at_kst).format(
      "YYYY-MM-DD HH:mm",
    )})`,
    "",
    report.summary ?? "",
    "",
    `- 총 기사: ${report.kpi.total_articles}`,
    `- 평균 점수: ${Math.round(report.kpi.average_relevance_score)}`,
    `- 고관련 기사: ${report.kpi.high_relevance_articles}`,
    "",
    "## 분야별",
    ...reportBriefingFields(report).map((field) => {
      return [
        `### ${field.field}`,
        ...field.items
          .slice(0, 3)
          .flatMap((item) => [
            `(${item.subfield}) ${item.title}`,
            ...item.bullets.slice(0, 4).map((bullet) => `- ${bullet}`),
            `*출처: ${item.source}`,
            "",
          ]),
      ].join("\n");
    }),
    "",
    "## Top 10",
    ...(report.top_10_hot_issues ?? []).slice(0, 10).map((article, index) => {
      return `${index + 1}. ${article.title}`;
    }),
  ].join("\n");
}

function reportBriefingFields(report: DailyReport) {
  const fields = report.briefing_report?.fields;
  if (fields?.length) {
    return fields;
  }

  return (report.field_summaries ?? []).map((field) => ({
    field: field.field,
    article_count: field.article_count,
    keywords: field.keywords,
    items:
      field.briefing_items ??
      field.representative_articles?.slice(0, 3).map((article) => ({
        subfield: article.category || "주요 현안",
        title: article.title,
        bullets: article.summary ? [article.summary] : ["요약이 준비 중입니다."],
        source: `${article.publisher || article.source_name}`,
        url: article.url,
        published_at_kst: article.published_at_kst,
        relevance_score: article.relevance_score,
      })) ??
      [],
  }));
}

function reportTypeLabel(reportType: string) {
  if (reportType === "weekly") return "주간";
  if (reportType === "monthly") return "월간";
  return "일일";
}

const demoBookmarks: Bookmark[] = [
  { id: 1, article_id: 1, note: "실전 회의 공유", created_at_kst: todayKst() },
  { id: 2, article_id: 2, note: "관련 부서 확인", created_at_kst: todayKst() },
  { id: 3, article_id: 3, note: "추적 필요", created_at_kst: todayKst() },
];
