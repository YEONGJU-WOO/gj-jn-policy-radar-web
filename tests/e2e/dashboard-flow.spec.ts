import { expect, test } from "@playwright/test";

const article = {
  id: 1,
  source_name: "정책브리핑",
  publisher: "정책브리핑",
  category: "산업",
  title: "광주 AI 산업 정책 발표",
  url: "https://example.com/article",
  published_at_kst: "2026-05-29T09:10:00+09:00",
  fetched_at_kst: "2026-05-29T09:20:00+09:00",
  summary: "광주 AI 산업 지원 정책 요약",
  relevance_score: 82,
  relevance_flag: true,
  entities: {
    PLACE: [{ term: "광주" }],
    AGENDA: [{ term: "산업" }],
    PERSON: [],
    INSTITUTION: [],
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/articles/1/similar")) return route.fulfill({ json: { data: [] } });
    if (url.includes("/api/articles/1")) {
      return route.fulfill({
        json: {
          data: {
            ...article,
            body: "광주 AI 산업 정책 본문",
            tokens: [],
            sentiment: 0.2,
            relevance_detail: { place: 0.8, agenda: 0.7 },
          },
        },
      });
    }
    if (url.includes("/api/articles"))
      return route.fulfill({ json: { data: [article], limit: 100, offset: 0 } });
    if (url.includes("/api/jobs/next"))
      return route.fulfill({
        json: {
          data: { job_name: "daily_pipeline", next_fire_time_kst: "2026-05-30T09:00:00+09:00" },
        },
      });
    if (url.includes("/api/jobs/runs")) return route.fulfill({ json: { data: [] } });
    if (url.includes("/api/reports/daily"))
      return route.fulfill({
        json: {
          data: {
            summary: "오늘 정책 흐름",
            kpi: {
              total_articles: 1,
              average_relevance_score: 82,
              high_relevance_articles: 1,
              source_count: 1,
            },
            top_10_hot_issues: [article],
            agenda_key_articles: {},
            rising_keywords: [],
            region_summaries: {},
            topic_cluster_summary: [],
            report_type: "daily",
            generated_at_kst: "2026-05-29T09:00:00+09:00",
            period: { start: "2026-05-29", end: "2026-05-29" },
          },
        },
      });
    if (url.includes("/api/topics")) return route.fulfill({ json: { data: [] } });
    if (url.includes("/api/trends/spikes")) return route.fulfill({ json: { data: [] } });
    if (url.includes("/api/bookmarks")) return route.fulfill({ json: { data: [] } });
    return route.fulfill({ json: { data: [] } });
  });
});

test("home to explorer filtering and bookmark flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Top 10 핫이슈")).toBeVisible();
  await page.getByText("광주 AI 산업 정책 발표").first().click();
  await expect(page).toHaveURL(/explorer/);
  await expect(page.getByText("상세 분석")).toBeVisible();
  await page.keyboard.press("b");
});
