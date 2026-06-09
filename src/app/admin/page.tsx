"use client";

import type { EChartsOption } from "echarts";
import { Brain, Play, Save, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArticles, useDictionary, useJobRuns, useNextRun } from "@/lib/hooks/use-dashboard";
import { countdownTo, formatKst } from "@/lib/utils/date";
import { downloadCsv } from "@/lib/utils/visualization";
import type { DictionaryEntry, DictionaryKind, JobRun } from "@/types/api";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const dictionaryTabs: Array<{ kind: DictionaryKind; label: string }> = [
  { kind: "places", label: "지명" },
  { kind: "institutions", label: "기관" },
  { kind: "agenda", label: "의제" },
  { kind: "people", label: "인물" },
];

const weightLabels = {
  place: "지명",
  institution: "기관",
  agenda: "의제",
  person: "인물",
  embedding: "임베딩",
};

type WeightKey = keyof typeof weightLabels;

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && role !== "admin")) {
      router.push("/login");
    }
  }, [role, router, status]);

  if (status === "loading") return <Skeleton className="h-[640px] w-full" />;
  if (role !== "admin") return null;

  const addLog = (message: string) =>
    setLogs((prev) =>
      [`${formatKst(new Date().toISOString())} · ${message}`, ...prev].slice(0, 20),
    );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">관리자</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사전, 가중치, 수집 상태, 일일 잡 실행을 관리합니다.
          </p>
        </div>

        <Tabs defaultValue="dictionary" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="dictionary">사전 관리</TabsTrigger>
            <TabsTrigger value="weights">점수 가중치</TabsTrigger>
            <TabsTrigger value="monitor">수집 모니터</TabsTrigger>
            <TabsTrigger value="llm">LLM 설정</TabsTrigger>
            <TabsTrigger value="jobs">잡 실행</TabsTrigger>
          </TabsList>
          <TabsContent value="dictionary">
            <DictionaryAdmin addLog={addLog} />
          </TabsContent>
          <TabsContent value="weights">
            <WeightAdmin addLog={addLog} />
          </TabsContent>
          <TabsContent value="monitor">
            <CollectorMonitor />
          </TabsContent>
          <TabsContent value="llm">
            <LLMAdmin addLog={addLog} />
          </TabsContent>
          <TabsContent value="jobs">
            <JobAdmin addLog={addLog} />
          </TabsContent>
        </Tabs>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length ? (
            logs.map((log) => (
              <div key={log} className="rounded-md border p-2 text-xs text-muted-foreground">
                {log}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">아직 변경 이력이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type LLMConfigForm = {
  enabled: boolean;
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
  timeout_seconds: number;
  max_output_tokens: number;
  clear_api_key?: boolean;
};

const providerModels: Record<string, string[]> = {
  openai: ["gpt-5.4-mini", "gpt-5.4", "gpt-4.1-mini", "gpt-4o-mini"],
  "openai-compatible": ["gpt-oss-120b", "llama-3.3-70b", "qwen/qwen3-32b"],
  openrouter: ["openai/gpt-oss-120b", "anthropic/claude-sonnet-4.5", "google/gemini-2.5-flash"],
  groq: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3-32b"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  anthropic: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-haiku-latest"],
  ollama: ["qwen2.5:7b", "llama3.1:8b", "gemma2:9b", "mistral:7b"],
};

function LLMAdmin({ addLog }: { addLog: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<string[]>(Object.keys(providerModels));
  const [apiKeySet, setApiKeySet] = useState(false);
  const [source, setSource] = useState("env");
  const [form, setForm] = useState<LLMConfigForm>({
    enabled: false,
    provider: "openai",
    model: "gpt-5.4-mini",
    api_key: "",
    base_url: "",
    timeout_seconds: 60,
    max_output_tokens: 1200,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/admin/llm/config", { cache: "no-store" });
      if (!response.ok) {
        toast.error("LLM 설정을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      const payload = await response.json();
      const config = payload.data.config;
      if (cancelled) return;
      setProviders(payload.data.providers ?? Object.keys(providerModels));
      setApiKeySet(Boolean(config.api_key_set));
      setSource(config.source ?? "env");
      setForm({
        enabled: Boolean(config.enabled),
        provider: config.provider ?? "openai",
        model: config.model ?? "gpt-5.4-mini",
        api_key: "",
        base_url: config.base_url ?? "",
        timeout_seconds: Number(config.timeout_seconds ?? 60),
        max_output_tokens: Number(config.max_output_tokens ?? 1200),
      });
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/llm/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("LLM 설정 저장에 실패했습니다.");
      return;
    }
    const payload = await response.json();
    setApiKeySet(Boolean(payload.data.config.api_key_set));
    setSource(payload.data.config.source ?? "db");
    setForm((prev) => ({ ...prev, api_key: "", clear_api_key: false }));
    toast.success("LLM 설정을 저장했습니다.");
    addLog(`LLM ${form.provider}/${form.model} 설정 저장`);
  }

  function updateProvider(provider: string) {
    setForm((prev) => ({
      ...prev,
      provider,
      model: providerModels[provider]?.[0] ?? prev.model,
      base_url:
        provider === "ollama"
          ? "http://host.docker.internal:11434/v1"
          : provider === "openai-compatible"
            ? prev.base_url
            : "",
    }));
  }

  if (loading) return <Skeleton className="h-[520px] w-full" />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            LLM 설정
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            일일 리포트의 전체 요약, 분야별 요약, 의사결정 포인트를 선택한 모델로 보강합니다.
          </p>
        </div>
        <Badge variant={form.enabled ? "default" : "outline"}>
          {form.enabled ? "사용 중" : "비활성"}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            일일 리포트에 LLM 사용
          </label>

          <label className="space-y-1 text-sm">
            <span>Provider</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.provider}
              onChange={(event) => updateProvider(event.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Model</span>
            <input
              list="llm-models"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={form.model}
              onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
            />
            <datalist id="llm-models">
              {(providerModels[form.provider] ?? []).map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>

          <label className="space-y-1 text-sm">
            <span>API Key {apiKeySet ? "(저장됨)" : "(미저장)"}</span>
            <Input
              type="password"
              value={form.api_key}
              placeholder={apiKeySet ? "새 키를 입력하면 교체됩니다." : "API 키를 입력하세요."}
              onChange={(event) => setForm((prev) => ({ ...prev, api_key: event.target.value }))}
            />
          </label>

          {(form.provider === "openai-compatible" || form.provider === "ollama") && (
            <label className="space-y-1 text-sm">
              <span>Base URL</span>
              <Input
                value={form.base_url}
                placeholder={
                  form.provider === "ollama"
                    ? "http://host.docker.internal:11434/v1"
                    : "https://your-provider.example/v1"
                }
                onChange={(event) => setForm((prev) => ({ ...prev, base_url: event.target.value }))}
              />
            </label>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Timeout</span>
              <Input
                type="number"
                value={form.timeout_seconds}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    timeout_seconds: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Max tokens</span>
              <Input
                type="number"
                value={form.max_output_tokens}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    max_output_tokens: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "저장 중" : "저장"}
            </Button>
            {apiKeySet && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((prev) => ({ ...prev, clear_api_key: true }))}
              >
                API 키 삭제 표시
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-muted/20 p-4 text-sm">
          <p className="font-medium">현재 선택</p>
          <div className="grid gap-2">
            <InfoRow label="설정 출처" value={source === "db" ? "관리자 저장값" : "환경변수"} />
            <InfoRow label="Provider" value={form.provider} />
            <InfoRow label="Model" value={form.model} />
            <InfoRow label="API Key" value={apiKeySet ? "저장됨" : "없음"} />
            <InfoRow label="Base URL" value={form.base_url || "provider 기본값"} />
          </div>
          <p className="pt-3 text-muted-foreground">
            저장 후 다음 일일 리포트 생성부터 적용됩니다. 바로 확인하려면 잡 실행 탭에서
            daily_pipeline을 수동 실행하세요.
          </p>
          {form.provider === "ollama" && (
            <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
              Ollama는 로컬 PC 또는 서버에서 먼저 실행되어야 합니다. 예:
              <code className="mt-2 block rounded bg-muted p-2">
                ollama pull qwen2.5:7b{"\n"}ollama serve
              </code>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DictionaryAdmin({ addLog }: { addLog: (message: string) => void }) {
  const [kind, setKind] = useState<DictionaryKind>("places");
  const [drafts, setDrafts] = useState<Record<string, DictionaryEntry>>({});
  const [uploadPreview, setUploadPreview] = useState<string[]>([]);
  const dictionary = useDictionary(kind);
  const rows = dictionary.data?.data ?? [];

  async function save(entry: DictionaryEntry) {
    const response = await fetch(
      `/api/admin/dictionaries/${kind}/${encodeURIComponent(entry.term)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliases: entry.aliases,
          category: entry.category,
          weight: Number(entry.weight),
        }),
      },
    );
    if (!response.ok) throw new Error("저장 실패");
    toast.success("사전을 저장했습니다.");
    addLog(`${entry.term} 사전 항목 저장`);
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>사전 관리</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadDictionary(kind, rows)}>
              사전 다운로드
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
              <Upload className="h-4 w-4" />
              엑셀 일괄 업로드
              <input
                type="file"
                accept=".xlsx,.csv"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const text = file.name.endsWith(".csv")
                    ? await file.text()
                    : `${file.name} 파일을 선택했습니다. 적용 전 미리보기를 확인하세요.`;
                  setUploadPreview(text.split(/\r?\n/).slice(0, 5));
                  addLog(`${file.name} 업로드 미리보기 생성`);
                }}
              />
            </label>
          </div>
        </div>
        <Tabs value={kind} onValueChange={(value) => setKind(value as DictionaryKind)}>
          <TabsList>
            {dictionaryTabs.map((item) => (
              <TabsTrigger key={item.kind} value={item.kind}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadPreview.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="mb-2 font-medium">업로드 미리보기</p>
            {uploadPreview.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <Button
              size="sm"
              className="mt-3"
              onClick={() =>
                toast.info("미리보기 적용 로직은 백엔드 업로드 API 연결 후 활성화됩니다.")
              }
            >
              적용
            </Button>
          </div>
        )}
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left">term</th>
                <th className="p-3 text-left">aliases</th>
                <th className="p-3 text-left">category</th>
                <th className="p-3 text-left">weight</th>
                <th className="p-3 text-left">저장</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const draft = drafts[entry.term] ?? entry;
                return (
                  <tr key={entry.term} className="border-b">
                    <td className="p-3 font-medium">{entry.term}</td>
                    <td className="p-3">
                      <Input
                        value={draft.aliases.join(", ")}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [entry.term]: {
                              ...draft,
                              aliases: event.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={draft.category}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [entry.term]: { ...draft, category: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.weight}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [entry.term]: { ...draft, weight: Number(event.target.value) },
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Button size="sm" onClick={() => save(draft)}>
                        <Save className="h-4 w-4" />
                        저장
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function WeightAdmin({ addLog }: { addLog: (message: string) => void }) {
  const [weights, setWeights] = useState<Record<WeightKey, number>>({
    place: 0.35,
    institution: 0.2,
    agenda: 0.2,
    person: 0.1,
    embedding: 0.15,
  });
  const articles = useArticles({ min_score: 30, limit: 10 });
  const normalized = normalizeWeights(weights);
  const chart = makeWeightChart(articles.data?.data ?? [], normalized);
  const dirty = Object.values(weights).some(Boolean);

  async function save() {
    const response = await fetch("/api/admin/weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) throw new Error("가중치 저장 실패");
    toast.success("가중치를 저장했습니다.");
    addLog("점수 가중치 저장 및 재계산 요청");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>점수 가중치</CardTitle>
        {dirty && <Badge variant="warning">변경됨</Badge>}
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          {(Object.keys(weightLabels) as WeightKey[]).map((key) => (
            <label key={key} className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{weightLabels[key]}</span>
                <span>{normalized[key].toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={weights[key]}
                onChange={(event) =>
                  setWeights((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                }
                className="w-full accent-primary"
              />
            </label>
          ))}
          <Button className="w-full" onClick={save}>
            저장 및 재계산
          </Button>
        </div>
        <ReactECharts option={chart} style={{ height: 420, width: "100%" }} />
      </CardContent>
    </Card>
  );
}

function CollectorMonitor() {
  const jobs = useJobRuns(20);
  const feeds = [
    "정책브리핑-산업",
    "정책브리핑-보건",
    "정책브리핑-교통",
    "연합뉴스-정치",
    "연합뉴스-경제",
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {feeds.map((feed, index) => {
          const failRate = index === 3 ? 12 : 3 + index;
          return (
            <Card key={feed}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{feed}</p>
                  <Badge variant={failRate >= 10 ? "warning" : "outline"}>{failRate}%</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">최근 24시간 {12 + index * 4}건</p>
                <p className="text-sm text-muted-foreground">평균 지연 {2 + index}분</p>
                <p className="text-sm text-muted-foreground">
                  마지막 수집 {formatKst(jobs.data?.data?.[0]?.started_at_kst)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>최근 7일 시간대별 수집량</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={makeCollectorHeatmap()} style={{ height: 420, width: "100%" }} />
        </CardContent>
      </Card>
    </div>
  );
}

function JobAdmin({ addLog }: { addLog: (message: string) => void }) {
  const jobs = useJobRuns(20);
  const next = useNextRun();
  const [running, setRunning] = useState(false);

  async function runNow() {
    setRunning(true);
    const response = await fetch("/api/admin/jobs/run-daily", { method: "POST" });
    setRunning(false);
    if (!response.ok) {
      toast.error("잡 실행에 실패했습니다.");
      return;
    }
    toast.success("daily_pipeline을 실행했습니다.");
    addLog("daily_pipeline 수동 실행");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-muted-foreground">다음 예정 실행</p>
            <p className="mt-1 text-xl font-semibold">
              매일 09:00 KST · {countdownTo(next.data?.data?.next_fire_time_kst)}
            </p>
          </div>
          <Button onClick={runNow} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? "실행 중" : "지금 즉시 실행"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>최근 잡 실행 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <JobTable rows={jobs.data?.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function JobTable({ rows }: { rows: JobRun[] }) {
  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="p-3 text-left">시작</th>
            <th className="p-3 text-left">종료</th>
            <th className="p-3 text-left">소요</th>
            <th className="p-3 text-left">신규</th>
            <th className="p-3 text-left">평균점수</th>
            <th className="p-3 text-left">토픽</th>
            <th className="p-3 text-left">상태</th>
            <th className="p-3 text-left">에러</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="p-3">{formatKst(row.started_at_kst)}</td>
              <td className="p-3">{formatKst(row.finished_at_kst)}</td>
              <td className="p-3">{Math.round(row.duration_seconds)}초</td>
              <td className="p-3">{row.new_articles_count}</td>
              <td className="p-3">{Math.round(row.average_score)}</td>
              <td className="p-3">{row.topic_count}</td>
              <td className="p-3">
                <Badge variant={row.status === "success" ? "default" : "warning"}>
                  {row.status === "success" ? "성공" : "실패"}
                </Badge>
              </td>
              <td className="p-3 text-muted-foreground">{row.error ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizeWeights(weights: Record<WeightKey, number>) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  ) as Record<WeightKey, number>;
}

function makeWeightChart(
  articles: Array<{ title: string; relevance_score: number }>,
  weights: Record<WeightKey, number>,
): EChartsOption {
  const rows = articles.length
    ? articles
    : Array.from({ length: 10 }, (_, index) => ({
        title: `샘플 기사 ${index + 1}`,
        relevance_score: 40 + index * 4,
      }));
  const multiplier = 0.85 + weights.place * 0.4 + weights.agenda * 0.25;
  return {
    tooltip: { trigger: "axis" },
    legend: {},
    xAxis: { type: "category", data: rows.map((_, index) => `#${index + 1}`) },
    yAxis: { type: "value", max: 100 },
    series: [
      { name: "before", type: "bar", data: rows.map((row) => Math.round(row.relevance_score)) },
      {
        name: "after",
        type: "bar",
        data: rows.map((row) => Math.min(100, Math.round(row.relevance_score * multiplier))),
      },
    ],
  };
}

function makeCollectorHeatmap(): EChartsOption {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const hours = Array.from({ length: 24 }, (_, index) => `${index}시`);
  return {
    tooltip: { position: "top" },
    xAxis: { type: "category", data: hours },
    yAxis: { type: "category", data: days },
    visualMap: {
      min: 0,
      max: 30,
      orient: "horizontal",
      bottom: 0,
      inRange: { color: ["#dbeafe", "#38bdf8", "#1d4ed8"] },
    },
    series: [
      {
        type: "heatmap",
        data: days.flatMap((_, day) =>
          hours.map((__, hour) => [hour, day, Math.round(Math.abs(Math.sin(day + hour / 3)) * 24)]),
        ),
      },
    ],
  };
}

function downloadDictionary(kind: DictionaryKind, rows: DictionaryEntry[]) {
  downloadCsv(
    `${kind}-dictionary.csv`,
    rows.map((row) => ({
      term: row.term,
      aliases: row.aliases.join("|"),
      category: row.category,
      weight: row.weight,
    })),
  );
}
