import { http, HttpResponse } from "msw";

import type { Article, ArticleDetail, Bookmark } from "@/types/api";

export const mockArticles: Article[] = [
  {
    id: 1,
    source_name: "정책브리핑",
    publisher: "산업통상자원부",
    category: "산업",
    title: "광주 AI 산업 육성 정책 발표",
    url: "https://example.test/articles/1",
    published_at_kst: "2026-05-29T09:00:00+09:00",
    fetched_at_kst: "2026-05-29T09:05:00+09:00",
    summary: "광주 AI 산업 지원 계획을 발표했다.",
    relevance_score: 87,
    relevance_flag: true,
    entities: {
      PLACE: [{ term: "광주", category: "지역" }],
      INSTITUTION: [{ term: "광주광역시청", category: "기관" }],
      AGENDA: [{ term: "AI", category: "산업" }],
      PERSON: [],
    },
  },
  {
    id: 2,
    source_name: "연합뉴스",
    publisher: "연합뉴스",
    category: "에너지",
    title: "전남 해상풍력 단지 투자 확대",
    url: "https://example.test/articles/2",
    published_at_kst: "2026-05-29T10:00:00+09:00",
    fetched_at_kst: "2026-05-29T10:03:00+09:00",
    summary: "전남 해상풍력 사업의 민간 투자가 확대됐다.",
    relevance_score: 78,
    relevance_flag: true,
    entities: {
      PLACE: [{ term: "전남", category: "지역" }],
      INSTITUTION: [{ term: "전라남도청", category: "기관" }],
      AGENDA: [{ term: "해상풍력", category: "에너지" }],
      PERSON: [],
    },
  },
];

const detail: ArticleDetail = {
  ...mockArticles[0],
  body: "광주 AI 산업 육성 정책은 지역 기관과 대학, 기업이 함께 추진한다.",
  tokens: ["광주", "AI", "산업"],
  sentiment: 0.2,
  relevance_detail: {
    subscores: {
      place: 0.9,
      institution: 0.7,
      agenda: 0.8,
      embedding: 0.6,
    },
  },
};

export const handlers = [
  http.get("*/api/articles", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    return HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: mockArticles.slice(offset, offset + limit),
      limit,
      offset,
    });
  }),
  http.get("*/api/articles/:id", ({ params }) =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: { ...detail, id: Number(params.id) },
    }),
  ),
  http.get("*/api/articles/:id/similar", () =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: [{ ...mockArticles[1], similarity: 0.82 }],
    }),
  ),
  http.get("*/api/bookmarks", () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        article_id: 1,
        note: "확인 필요",
        created_at_kst: "2026-05-29T12:00:00+09:00",
      },
    ];
    return HttpResponse.json({ served_at_kst: "2026-05-29T12:00:00+09:00", data: bookmarks });
  }),
  http.post("*/api/bookmarks", async ({ request }) => {
    const body = (await request.json()) as { article_id: number; note?: string };
    return HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: {
        id: 2,
        article_id: body.article_id,
        note: body.note,
        created_at_kst: "2026-05-29T12:00:00+09:00",
      },
    });
  }),
  http.get("*/api/trends/keywords", ({ request }) => {
    const url = new URL(request.url);
    const terms = (url.searchParams.get("terms") || "AI,해상풍력").split(",").filter(Boolean);
    return HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: Object.fromEntries(
        terms.map((term) => [
          term,
          {
            "2026-05-27": 3,
            "2026-05-28": 5,
            "2026-05-29": 8,
          },
        ]),
      ),
    });
  }),
  http.get("*/api/trends/spikes", () =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: [
        { term: "AI", count: 12, z_score: 2.4 },
        { term: "해상풍력", count: 9, z_score: 2.1 },
      ],
    }),
  ),
  http.get("*/api/topics", () =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: [
        {
          id: 1,
          label: "AI 산업 육성",
          keywords: ["AI", "산업", "데이터센터"],
          article_count: 18,
          created_at_kst: "2026-05-29T09:00:00+09:00",
        },
        {
          id: 2,
          label: "전남 해상풍력",
          keywords: ["해상풍력", "에너지", "RE100"],
          article_count: 12,
          created_at_kst: "2026-05-29T09:00:00+09:00",
        },
      ],
    }),
  ),
  http.get("*/api/topics/:id/articles", () =>
    HttpResponse.json({ served_at_kst: "2026-05-29T12:00:00+09:00", data: mockArticles }),
  ),
  http.get("*/api/network/cooccurrence", () =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: {
        nodes: [
          { id: "광주", weight: 24 },
          { id: "AI", weight: 18 },
          { id: "전남", weight: 21 },
          { id: "해상풍력", weight: 16 },
        ],
        edges: [
          { source: "광주", target: "AI", weight: 8 },
          { source: "전남", target: "해상풍력", weight: 9 },
        ],
      },
    }),
  ),
  http.get("*/api/analytics/lifecycle/:topicId", ({ params }) =>
    HttpResponse.json({
      served_at_kst: "2026-05-29T12:00:00+09:00",
      data: {
        topic_id: Number(params.topicId),
        label: "AI 산업 육성",
        keywords: ["AI", "산업"],
        series: [
          { date: "2026-05-27", value: 3 },
          { date: "2026-05-28", value: 9 },
          { date: "2026-05-29", value: 5 },
        ],
        stages: [
          { date: "2026-05-27", value: 3, stage: "부상" },
          { date: "2026-05-28", value: 9, stage: "정점" },
          { date: "2026-05-29", value: 5, stage: "소멸" },
        ],
      },
    }),
  ),
];
