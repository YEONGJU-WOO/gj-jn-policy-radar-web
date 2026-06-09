"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as endpoints from "@/lib/api/endpoints";
import type {
  AlertRuleInput,
  ApiPeriod,
  ArticleQuery,
  BookmarkInput,
  DictionaryEntryInput,
  DictionaryKind,
  RegionLevel,
} from "@/types/api";

const stale = {
  articles: 5 * 60_000,
  topics: 60 * 60_000,
  jobs: 30_000,
  analytics: 10 * 60_000,
};

export function useArticles(params: ArticleQuery = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["articles", params],
    queryFn: () => endpoints.getArticles(params),
    staleTime: stale.articles,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useArticle(id?: number) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: () => endpoints.getArticle(id as number),
    enabled: Boolean(id),
    staleTime: stale.articles,
  });
}

export function useSimilarArticles(id?: number, k = 5) {
  return useQuery({
    queryKey: ["article", id, "similar", k],
    queryFn: () => endpoints.getSimilarArticles(id as number, k),
    enabled: Boolean(id),
    staleTime: stale.articles,
  });
}

export function useTopics(period: ApiPeriod = "14d") {
  return useQuery({
    queryKey: ["topics", period],
    queryFn: () => endpoints.getTopics(period),
    staleTime: stale.topics,
  });
}

export function useTopicArticles(id?: number) {
  return useQuery({
    queryKey: ["topic", id, "articles"],
    queryFn: () => endpoints.getTopicArticles(id as number),
    enabled: Boolean(id),
    staleTime: stale.topics,
  });
}

export function useTrendKeywords(terms: string[], period: ApiPeriod = "7d") {
  return useQuery({
    queryKey: ["trends", "keywords", terms, period],
    queryFn: () => endpoints.getTrendKeywords(terms, period),
    enabled: terms.length > 0,
    staleTime: stale.analytics,
  });
}

export function useSpikes(period: ApiPeriod = "7d") {
  return useQuery({
    queryKey: ["trends", "spikes", period],
    queryFn: () => endpoints.getSpikes(period),
    staleTime: stale.analytics,
  });
}

export function useAnalyticsWordCloud(params: {
  period?: ApiPeriod;
  regions?: string[];
  agendas?: string[];
  limit?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "wordcloud", params],
    queryFn: () => endpoints.getAnalyticsWordCloud(params),
    staleTime: stale.analytics,
    placeholderData: keepPreviousData,
  });
}

export function useRegionsSummary(level: RegionLevel = "gwangju") {
  return useQuery({
    queryKey: ["regions", "summary", level],
    queryFn: () => endpoints.getRegionsSummary(level),
    staleTime: stale.analytics,
  });
}

export function useRegionArticles(code?: string) {
  return useQuery({
    queryKey: ["regions", code, "articles"],
    queryFn: () => endpoints.getRegionArticles(code as string),
    enabled: Boolean(code),
    staleTime: stale.articles,
  });
}

export function useCooccurrence(period: ApiPeriod = "7d", top = 50) {
  return useQuery({
    queryKey: ["network", "cooccurrence", period, top],
    queryFn: () => endpoints.getCooccurrence(period, top),
    staleTime: stale.analytics,
  });
}

export function useDailyReport(date: string) {
  return useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => endpoints.getDailyReport(date),
    staleTime: stale.analytics,
  });
}

export function useJobRuns(limit = 20) {
  return useQuery({
    queryKey: ["jobs", "runs", limit],
    queryFn: () => endpoints.getJobRuns(limit),
    staleTime: stale.jobs,
    refetchInterval: stale.jobs,
  });
}

export function useNextRun() {
  return useQuery({
    queryKey: ["jobs", "next"],
    queryFn: endpoints.getNextRun,
    staleTime: stale.jobs,
    refetchInterval: stale.jobs,
  });
}

export function useAnalyticsAgendaDistribution(period: ApiPeriod = "14d") {
  return useQuery({
    queryKey: ["analytics", "agenda-distribution", period],
    queryFn: () => endpoints.getAnalyticsAgendaDistribution(period),
    staleTime: stale.analytics,
  });
}

export function useAnalyticsSentimentTrend(
  period: ApiPeriod = "14d",
  groupBy: "region" | "agenda" = "agenda",
) {
  return useQuery({
    queryKey: ["analytics", "sentiment-trend", period, groupBy],
    queryFn: () => endpoints.getAnalyticsSentimentTrend(period, groupBy),
    staleTime: stale.analytics,
  });
}

export function useAnalyticsRegionMatrix(period: ApiPeriod = "30d") {
  return useQuery({
    queryKey: ["analytics", "region-matrix", period],
    queryFn: () => endpoints.getAnalyticsRegionMatrix(period),
    staleTime: stale.analytics,
  });
}

export function useAnalyticsLifecycle(topicId?: number) {
  return useQuery({
    queryKey: ["analytics", "lifecycle", topicId],
    queryFn: () => endpoints.getAnalyticsLifecycle(topicId as number),
    enabled: Boolean(topicId),
    staleTime: stale.analytics,
  });
}

export function useDictionary(kind: DictionaryKind) {
  return useQuery({
    queryKey: ["dictionaries", kind],
    queryFn: () => endpoints.getDictionary(kind),
    staleTime: stale.topics,
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: ["bookmarks"],
    queryFn: endpoints.getBookmarks,
    staleTime: stale.articles,
  });
}

export function useCreateBookmark() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: BookmarkInput) => endpoints.createBookmark(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
}

export function useCreateAlert() {
  return useMutation({
    mutationFn: (input: AlertRuleInput) => endpoints.createAlert(input),
  });
}

export function useUpdateDictionaryEntry(kind: DictionaryKind) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ term, input }: { term: string; input: DictionaryEntryInput }) =>
      endpoints.updateDictionaryEntry(kind, term, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["dictionaries", kind] }),
  });
}

export function useJobStatus() {
  const lastRun = useJobRuns(1);
  const nextRun = useNextRun();
  return { lastRun, nextRun };
}

export const useAgendaDistribution = useAnalyticsAgendaDistribution;
export const useSentimentTrend = useAnalyticsSentimentTrend;
export const useRegionMatrix = useAnalyticsRegionMatrix;
