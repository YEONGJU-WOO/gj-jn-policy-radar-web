import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  AlertRule,
  AlertRuleInput,
  AnalyticsAgendaDistribution,
  AnalyticsRegionMatrix,
  AnalyticsSentimentTrend,
  ApiEnvelope,
  ApiPeriod,
  Article,
  ArticleDetail,
  ArticleQuery,
  BackendRegionMatrix,
  Bookmark,
  BookmarkInput,
  CooccurrenceGraph,
  DailyReport,
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryKind,
  HealthStatus,
  JobNext,
  JobRun,
  Paginated,
  RegionLevel,
  RegionSummary,
  SimilarArticle,
  SpikeKeyword,
  Topic,
  TopicArticle,
  TopicLifecycle,
  TrendKeywordResponse,
  WordCloudKeyword,
} from "@/types/api";

export function getArticles(params: ArticleQuery = {}): Promise<Paginated<Article>> {
  return apiGet<Article[]>("/api/articles", params) as Promise<Paginated<Article>>;
}

export function getArticle(id: number): Promise<ApiEnvelope<ArticleDetail>> {
  return apiGet<ArticleDetail>(`/api/articles/${id}`);
}

export function getSimilarArticles(id: number, k = 5): Promise<ApiEnvelope<SimilarArticle[]>> {
  return apiGet<SimilarArticle[]>(`/api/articles/${id}/similar`, { k });
}

export function getTopics(period: ApiPeriod = "14d"): Promise<ApiEnvelope<Topic[]>> {
  return apiGet<Topic[]>("/api/topics", { period });
}

export function getTopicArticles(id: number): Promise<ApiEnvelope<TopicArticle[]>> {
  return apiGet<TopicArticle[]>(`/api/topics/${id}/articles`);
}

export function getTrendKeywords(
  terms: string[],
  period: ApiPeriod = "7d",
): Promise<ApiEnvelope<TrendKeywordResponse>> {
  return apiGet<TrendKeywordResponse>("/api/trends/keywords", {
    terms: terms.join(","),
    period,
  });
}

export function getSpikes(period: ApiPeriod = "7d"): Promise<ApiEnvelope<SpikeKeyword[]>> {
  return apiGet<SpikeKeyword[]>("/api/trends/spikes", { period });
}

export function getAnalyticsWordCloud(params: {
  period?: ApiPeriod;
  regions?: string[];
  agendas?: string[];
  limit?: number;
}): Promise<ApiEnvelope<WordCloudKeyword[]>> {
  return apiGet<WordCloudKeyword[]>("/api/analytics/wordcloud", {
    period: params.period ?? "14d",
    regions: params.regions?.join(","),
    agendas: params.agendas?.join(","),
    limit: params.limit,
  });
}

export function getRegionsSummary(
  level: RegionLevel = "gwangju",
): Promise<ApiEnvelope<RegionSummary[]>> {
  return apiGet<RegionSummary[]>("/api/regions/summary", { level });
}

export function getRegionArticles(code: string): Promise<ApiEnvelope<Article[]>> {
  return apiGet<Article[]>(`/api/regions/${encodeURIComponent(code)}/articles`);
}

export function getCooccurrence(
  period: ApiPeriod = "7d",
  top = 50,
): Promise<ApiEnvelope<CooccurrenceGraph>> {
  return apiGet<CooccurrenceGraph>("/api/network/cooccurrence", { period, top });
}

export function getDictionary(kind: DictionaryKind): Promise<ApiEnvelope<DictionaryEntry[]>> {
  return apiGet<DictionaryEntry[]>(`/api/dictionaries/${kind}`);
}

export function updateDictionaryEntry(
  kind: DictionaryKind,
  term: string,
  input: DictionaryEntryInput,
): Promise<ApiEnvelope<{ updated: boolean; entry: DictionaryEntry }>> {
  return apiPut(`/api/dictionaries/${kind}/${encodeURIComponent(term)}`, input);
}

export function getJobRuns(limit = 20): Promise<ApiEnvelope<JobRun[]>> {
  return apiGet<JobRun[]>("/api/jobs/runs", { limit });
}

export function getNextRun(): Promise<ApiEnvelope<JobNext>> {
  return apiGet<JobNext>("/api/jobs/next");
}

export function runDailyNow(): Promise<ApiEnvelope<JobRun | Record<string, unknown>>> {
  return apiPost<JobRun | Record<string, unknown>>("/api/jobs/run-daily");
}

export function createBookmark(input: BookmarkInput): Promise<ApiEnvelope<Bookmark>> {
  return apiPost<Bookmark>("/api/bookmarks", input);
}

export function getBookmarks(): Promise<ApiEnvelope<Bookmark[]>> {
  return apiGet<Bookmark[]>("/api/bookmarks");
}

export function createAlert(input: AlertRuleInput): Promise<ApiEnvelope<AlertRule>> {
  return apiPost<AlertRule>("/api/alerts", input);
}

export function getDailyReport(
  date: string,
  format: "json" | "pdf" = "json",
): Promise<ApiEnvelope<DailyReport>> {
  return apiGet<DailyReport>("/api/reports/daily", { date, format });
}

export function getDailyReportPdfUrl(date: string) {
  return `/api/reports/daily?date=${encodeURIComponent(date)}&format=pdf`;
}

export function getAnalyticsAgendaDistribution(
  period: ApiPeriod = "14d",
): Promise<ApiEnvelope<AnalyticsAgendaDistribution>> {
  return apiGet<AnalyticsAgendaDistribution>("/api/analytics/agenda-distribution", { period });
}

export function getAnalyticsSentimentTrend(
  period: ApiPeriod = "14d",
  groupBy: "region" | "agenda" = "agenda",
): Promise<ApiEnvelope<AnalyticsSentimentTrend>> {
  return apiGet<AnalyticsSentimentTrend>("/api/analytics/sentiment-trend", {
    period,
    group_by: groupBy,
  });
}

export async function getAnalyticsRegionMatrix(
  period: ApiPeriod = "30d",
): Promise<ApiEnvelope<AnalyticsRegionMatrix>> {
  const response = await apiGet<BackendRegionMatrix>("/api/analytics/region-matrix", { period });
  return { ...response, data: normalizeMatrix(response.data) };
}

export function getAnalyticsLifecycle(topicId: number): Promise<ApiEnvelope<TopicLifecycle>> {
  return apiGet<TopicLifecycle>(`/api/analytics/lifecycle/${topicId}`);
}

export function getHealth(): Promise<ApiEnvelope<HealthStatus>> {
  return apiGet<HealthStatus>("/api/health");
}

export function normalizeMatrix(matrix: BackendRegionMatrix): AnalyticsRegionMatrix {
  const lookup = new Map(matrix.values.map((item) => [`${item.row}::${item.col}`, item.value]));
  return {
    rows: matrix.rows,
    cols: matrix.cols,
    values: matrix.rows.map((row) => matrix.cols.map((col) => lookup.get(`${row}::${col}`) ?? 0)),
  };
}
