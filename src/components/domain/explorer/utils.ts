import dayjs from "dayjs";

import { GWANGJU_DISTRICTS, JEONNAM_COUNTIES } from "@/components/domain/explorer/constants";
import type { ExplorerSort } from "@/lib/stores/filter-store";
import type { Article, ArticleDetail, EntityMatch } from "@/types/api";

export function articleAgendas(article: Article) {
  return unique(
    [
      ...(article.entities?.AGENDA?.flatMap((entity) => [entity.term, entity.category ?? ""]) ??
        []),
      article.category,
    ].filter(Boolean),
  );
}

export function articleRegions(article: Article) {
  const places = unique(
    article.entities?.PLACE?.map((entity) => normalizeRegionLabel(entity.term)) ?? [],
  );
  if (places.some((place) => place === "광주" || GWANGJU_DISTRICTS.includes(place))) {
    return unique(["광주 전체", ...places.filter((place) => place !== "광주")]);
  }
  return places;
}

export function articleTerms(article: Article | ArticleDetail) {
  return unique(
    Object.values(article.entities ?? {})
      .flat()
      .map((entity) => entity.term)
      .filter(Boolean),
  );
}

export function articleText(article: Article | ArticleDetail) {
  const terms = articleTerms(article).join(" ");
  return `${article.title} ${article.summary ?? ""} ${article.category} ${article.publisher} ${article.source_name} ${terms}`;
}

export function matchesSource(article: Article, sources: string[]) {
  return !sources.length || sources.some((source) => article.source_name.includes(source));
}

export function matchesAgenda(article: Article, agendas: string[]) {
  if (!agendas.length) return true;
  const text = articleText(article);
  return agendas.some((agenda) => text.includes(agenda));
}

export function matchesRegion(article: Article, regions: string[]) {
  if (!regions.length) return true;
  const text = articleText(article);
  return regions.some((region) => regionAliases(region).some((alias) => text.includes(alias)));
}

export function sortArticles(articles: Article[], sort: ExplorerSort) {
  return [...articles].sort((a, b) => {
    if (sort === "published_asc") {
      return dayjs(a.published_at_kst).valueOf() - dayjs(b.published_at_kst).valueOf();
    }
    if (sort === "published_desc") {
      return dayjs(b.published_at_kst).valueOf() - dayjs(a.published_at_kst).valueOf();
    }
    return b.relevance_score - a.relevance_score;
  });
}

export function relevanceSubscores(article?: ArticleDetail) {
  const detail = article?.relevance_detail ?? {};
  const raw =
    typeof detail.subscores === "object" && detail.subscores
      ? (detail.subscores as Record<string, unknown>)
      : (detail as Record<string, unknown>);

  const labels: Record<string, string> = {
    place: "지명",
    institution: "기관",
    agenda: "의제",
    person: "인물",
    embedding: "임베딩",
  };

  return Object.entries(raw)
    .filter(([, value]) => typeof value === "number")
    .slice(0, 5)
    .map(([key, value]) => {
      const normalizedKey = key.replace("_score", "");
      const numeric = Number(value);
      return {
        key: normalizedKey,
        label: labels[normalizedKey] ?? normalizedKey,
        value: numeric > 1 ? Math.min(100, numeric) : Math.round(numeric * 100),
      };
    });
}

export function entityValues(article: ArticleDetail | undefined, kind: string): EntityMatch[] {
  return article?.entities?.[kind] ?? [];
}

export function regionAliases(region: string) {
  if (region === "광주 전체") return ["광주", "광주광역시", ...GWANGJU_DISTRICTS];
  if (region === "전남") return ["전남", "전라남도", ...JEONNAM_COUNTIES];
  return [region];
}

function normalizeRegionLabel(region: string) {
  if (region === "광주광역시") return "광주";
  if (region === "전라남도") return "전남";
  return region;
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}
