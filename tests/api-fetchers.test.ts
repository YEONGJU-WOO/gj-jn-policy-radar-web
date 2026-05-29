import { beforeEach, describe, expect, it, vi } from "vitest";

import { cleanParams } from "@/lib/api/client";
import {
  getAnalyticsRegionMatrix,
  getArticles,
  getDailyReport,
  getSimilarArticles,
  getTrendKeywords,
} from "@/lib/api/endpoints";

const getMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiGet: (path: string, params?: Record<string, unknown>) => getMock(path, params),
  };
});

describe("api fetchers", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ served_at_kst: "now", data: [] });
  });

  it("serializes article query parameters", async () => {
    await getArticles({ min_score: 30, region: "광주", q: "", limit: 20, offset: 0 });

    expect(getMock).toHaveBeenCalledWith("/api/articles", {
      min_score: 30,
      region: "광주",
      q: "",
      limit: 20,
      offset: 0,
    });
    expect(cleanParams({ min_score: 30, region: "광주", q: "" })).toEqual({
      min_score: "30",
      region: "광주",
    });
  });

  it("builds path and params for nested article resources", async () => {
    await getSimilarArticles(12, 7);

    expect(getMock).toHaveBeenCalledWith("/api/articles/12/similar", { k: 7 });
  });

  it("serializes keyword arrays as comma separated terms", async () => {
    await getTrendKeywords(["AI", "해상풍력"], "14d");

    expect(getMock).toHaveBeenCalledWith("/api/trends/keywords", {
      terms: "AI,해상풍력",
      period: "14d",
    });
  });

  it("serializes report date and format", async () => {
    await getDailyReport("2026-05-28", "json");

    expect(getMock).toHaveBeenCalledWith("/api/reports/daily", {
      date: "2026-05-28",
      format: "json",
    });
  });

  it("normalizes backend matrix objects into numeric matrix", async () => {
    getMock.mockResolvedValueOnce({
      served_at_kst: "now",
      data: {
        rows: ["gwangju", "jeonnam"],
        cols: ["산업", "에너지"],
        values: [
          { row: "gwangju", col: "산업", value: 2 },
          { row: "jeonnam", col: "에너지", value: 3 },
        ],
      },
    });

    const response = await getAnalyticsRegionMatrix("30d");

    expect(response.data.values).toEqual([
      [2, 0],
      [0, 3],
    ]);
  });
});
