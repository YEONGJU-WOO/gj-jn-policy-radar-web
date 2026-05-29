export type ApiEnvelope<T> = {
  served_at_kst: string;
  last_job_run_at_kst?: string | null;
  data: T;
  limit?: number;
  offset?: number;
  period?: string;
  group_by?: string;
  level?: string;
  code?: string;
};

export type Paginated<T> = ApiEnvelope<T[]> & {
  limit: number;
  offset: number;
};

export type ApiErrorPayload = {
  status: number;
  code: string;
  message: string;
  detail?: unknown;
};

export type EntityMatch = {
  term: string;
  forms?: string[];
  category?: string;
  weight?: number;
  count?: number;
  source?: string;
};

export type ArticleMeta = {
  tokens: string[];
  entities: Record<"PLACE" | "INSTITUTION" | "AGENDA" | "PERSON" | string, EntityMatch[]>;
  embedding?: number[];
  summary: string;
  sentiment: number;
  relevance_score: number;
  relevance_flag: boolean;
  relevance_detail: Record<string, unknown>;
  enriched_at_kst?: string;
};

export type Article = {
  id: number;
  source_name: string;
  publisher: string;
  category: string;
  title: string;
  url: string;
  published_at_kst: string | null;
  fetched_at_kst: string;
  summary: string | null;
  relevance_score: number;
  relevance_flag: boolean;
  entities: ArticleMeta["entities"];
};

export type ArticleDetail = Article & {
  body: string | null;
  tokens: string[];
  sentiment: number | null;
  relevance_detail: Record<string, unknown>;
};

export type SimilarArticle = Article & {
  similarity: number;
};

export type Topic = {
  id: number;
  label: string;
  keywords: string[];
  article_count: number;
  created_at_kst: string;
};

export type TopicArticle = Article & {
  topic_score: number;
};

export type TrendPoint = { date: string; value: number };
export type SeriesPoint = TrendPoint;
export type TrendKeywordResponse = Record<string, Record<string, number>>;
export type SpikeKeyword = { term: string; count: number; z_score: number };

export type RegionSummary = {
  code: string;
  name: string;
  category: string;
  article_count: number;
  average_score: number;
};

export type CooccurrenceGraph = {
  nodes: Array<{ id: string; weight: number }>;
  edges: Array<{ source: string; target: string; weight: number }>;
};

export type DictionaryKind = "places" | "institutions" | "agenda" | "people";
export type DictionaryEntry = {
  term: string;
  aliases: string[];
  category: string;
  weight: number;
  source?: string;
};

export type DictionaryEntryInput = {
  aliases: string[];
  category: string;
  weight: number;
};

export type JobRun = {
  id: number;
  job_name: string;
  status: string;
  started_at_kst: string;
  finished_at_kst?: string | null;
  duration_seconds: number;
  new_articles_count: number;
  enriched_count: number;
  average_score: number;
  topic_count: number;
  step_results?: Record<string, unknown>;
  error?: string | null;
};

export type JobNext = {
  job_name: string;
  next_fire_time_kst: string;
};

export type Bookmark = {
  id: number;
  article_id: number;
  note?: string | null;
  created_at_kst: string;
};

export type BookmarkInput = {
  article_id: number;
  note?: string | null;
};

export type AlertRule = {
  id: number;
  name: string;
  query: Record<string, unknown>;
  channel: "email" | "slack" | "webhook";
  target: string;
  active: boolean;
};

export type AlertRuleInput = Omit<AlertRule, "id">;

export type DailyReport = {
  report_type: string;
  generated_at_kst: string;
  summary?: string;
  period: { start: string; end: string };
  kpi: {
    total_articles: number;
    average_relevance_score: number;
    high_relevance_articles: number;
    source_count: number;
  };
  top_10_hot_issues: Article[];
  agenda_key_articles: Record<string, Article[]>;
  rising_keywords: SpikeKeyword[];
  region_summaries: Record<
    string,
    { article_count: number; summary: string; top_articles: Article[] }
  >;
  topic_cluster_summary: Array<{
    id: number;
    label: string;
    keywords: string[];
    article_count: number;
    articles: Article[];
  }>;
};

export type AnalyticsAgendaDistribution = Array<{
  agenda: string;
  count: number;
  share: number;
}>;

export type AnalyticsSentimentTrend = Record<string, TrendPoint[]>;

export type AnalyticsRegionMatrix = {
  rows: string[];
  cols: string[];
  values: number[][];
};

export type BackendRegionMatrix = {
  rows: string[];
  cols: string[];
  values: Array<{ row: string; col: string; value: number }>;
};

export type TopicLifecycle = {
  topic_id: number;
  label: string;
  keywords: string[];
  series: TrendPoint[];
  stages: Array<{ date: string; value: number; stage: "부상" | "정점" | "소멸" | string }>;
};

export type HealthStatus = {
  status: string;
  timezone: string;
};

export type ArticleQuery = {
  from?: string;
  to?: string;
  min_score?: number;
  region?: string;
  agenda?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export type Period = "today" | "7d" | "14d" | "30d";
export type ApiPeriod = "7d" | "14d" | "30d" | "90d";
export type RegionLevel = "gwangju" | "jeonnam";
