"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, FileDown, GripVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
  keywords: z.string().min(1, "키워드를 입력하세요."),
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
          자동 리포트 확인, 알림 규칙 생성, 북마크 이슈카드 정리를 처리합니다.
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
                    await navigator.clipboard.writeText(toMarkdown(report.data?.data));
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
              <ReportPreview report={report.data?.data} />
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
                      <th className="p-3 text-left">활성</th>
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

function ReportPreview({ report }: { report?: DailyReport }) {
  if (!report)
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          리포트 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="총 기사" value={report.kpi.total_articles} />
        <Kpi label="평균 점수" value={Math.round(report.kpi.average_relevance_score)} />
        <Kpi label="고관련 기사" value={report.kpi.high_relevance_articles} />
        <Kpi label="출처 수" value={report.kpi.source_count} />
      </div>
      <Section title="Top10 핫이슈">
        {report.top_10_hot_issues?.slice(0, 10).map((a) => (
          <ArticleLine key={a.id} article={a} />
        ))}
      </Section>
      <Section title="영역별 핵심 기사">
        {Object.entries(report.agenda_key_articles ?? {}).map(([agenda, rows]) => (
          <div key={agenda} className="rounded-md border p-3">
            <p className="font-medium">{agenda}</p>
            {rows.slice(0, 3).map((a) => (
              <ArticleLine key={a.id} article={a} />
            ))}
          </div>
        ))}
      </Section>
      <Section title="부상 키워드">
        <div className="flex flex-wrap gap-2">
          {(report.rising_keywords ?? []).map((k) => (
            <Badge key={k.term} variant="secondary">
              {k.term} z={k.z_score.toFixed(1)}
            </Badge>
          ))}
        </div>
      </Section>
      <Section title="광주·전남 분리 요약">
        {Object.entries(report.region_summaries ?? {}).map(([region, item]) => (
          <div key={region} className="rounded-md border p-3">
            <p className="font-medium">{region}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
          </div>
        ))}
      </Section>
      <Section title="토픽 클러스터">
        {(report.topic_cluster_summary ?? []).slice(0, 8).map((topic) => (
          <div key={topic.id} className="rounded-md border p-3">
            <p className="font-medium">{topic.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{topic.keywords.join(", ")}</p>
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
    },
    onError: () => toast.error("알림 규칙 저장에 실패했습니다. 관리자 로그인을 확인해주세요."),
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
          onSubmit={form.handleSubmit((v) =>
            mutation.mutate({
              name: v.name,
              query: {
                keywords: split(v.keywords),
                regions: split(v.regions),
                agendas: split(v.agendas),
                min_score: v.minScore,
              },
              channel: v.channel,
              target: v.target,
              active: v.active,
            }),
          )}
        >
          <Input placeholder="규칙 이름" {...form.register("name")} />
          <Input placeholder="키워드, 쉼표로 구분" {...form.register("keywords")} />
          <Input placeholder="지역, 쉼표로 구분" {...form.register("regions")} />
          <Input placeholder="영역, 쉼표로 구분" {...form.register("agendas")} />
          <label className="space-y-1 text-sm">
            <span>점수 임계값: {form.watch("minScore")}점</span>
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
            onValueChange={(v) =>
              form.setValue("channel", v as AlertForm["channel"], { shouldDirty: true })
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
                  onNote={(note) => setNotes((p) => ({ ...p, [bookmark.id]: note }))}
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
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(bookmark.id))}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropOn(Number(e.dataTransfer.getData("text/plain")), bookmark.id)}
      className="rounded-md border bg-background p-3"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 h-4 w-4 cursor-grab text-muted-foreground" />
        <Link href={`/explorer?article=${bookmark.article_id}`} className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">
            {article?.title ?? `북마크 기사 #${bookmark.article_id}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {article
              ? `${Math.round(article.relevance_score)}점 · ${article.category}`
              : "기사 데이터를 불러오는 중"}
          </p>
        </Link>
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
    <Link
      href={`/explorer?article=${article.id}`}
      className="block rounded-md border p-3 text-sm hover:bg-muted/50"
    >
      <span className="line-clamp-2 font-medium">{article.title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {Math.round(article.relevance_score)}점 · {article.source_name}
      </span>
    </Link>
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
  const q = rule.query as {
    keywords?: string[];
    regions?: string[];
    agendas?: string[];
    min_score?: number;
  };
  return [
    `키워드 ${q.keywords?.join("/") || "-"}`,
    q.regions?.length ? `지역 ${q.regions.join("/")}` : "",
    q.agendas?.length ? `영역 ${q.agendas.join("/")}` : "",
    `점수 ${q.min_score ?? 0}+`,
  ]
    .filter(Boolean)
    .join(" · ");
}
function toMarkdown(report?: DailyReport) {
  if (!report) return "리포트 데이터가 없습니다.";
  return [
    `# 정책 리포트 (${dayjs(report.generated_at_kst).format("YYYY-MM-DD HH:mm")})`,
    "",
    `- 총 기사: ${report.kpi.total_articles}`,
    `- 평균 점수: ${Math.round(report.kpi.average_relevance_score)}`,
    `- 고관련 기사: ${report.kpi.high_relevance_articles}`,
    "",
    "## Top10",
    ...(report.top_10_hot_issues ?? []).slice(0, 10).map((a, i) => `${i + 1}. ${a.title}`),
  ].join("\n");
}
const demoBookmarks: Bookmark[] = [
  { id: 1, article_id: 1, note: "오전 회의 공유", created_at_kst: todayKst() },
  { id: 2, article_id: 2, note: "관련 부서 확인", created_at_kst: todayKst() },
  { id: 3, article_id: 3, note: "추적 필요", created_at_kst: todayKst() },
];
