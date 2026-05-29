import { describe, expect, it } from "vitest";

import {
  filterMeaningfulKeywords,
  isMeaningfulKoreanKeyword,
  normalizeKeywordTerm,
} from "@/lib/utils/korean-stopwords";

describe("korean stopword filter", () => {
  it("filters particles, connectors, and weak verb stems", () => {
    expect(isMeaningfulKoreanKeyword("그리고")).toBe(false);
    expect(isMeaningfulKoreanKeyword("위해")).toBe(false);
    expect(isMeaningfulKoreanKeyword("따르")).toBe(false);
    expect(isMeaningfulKoreanKeyword("광주")).toBe(true);
    expect(isMeaningfulKoreanKeyword("해상풍력")).toBe(true);
  });

  it("keeps only meaningful visualization keywords", () => {
    expect(filterMeaningfulKeywords(["그리고", "광주", "자료", "AI", "위하"])).toEqual([
      "광주",
      "AI",
    ]);
  });

  it("normalizes simple Korean particle suffixes", () => {
    expect(normalizeKeywordTerm("광주에서")).toBe("광주");
    expect(normalizeKeywordTerm("산업을")).toBe("산업");
    expect(isMeaningfulKoreanKeyword("광주에서")).toBe(true);
  });
});
