import { describe, expect, it } from "vitest";

import { fixMojibake } from "@/lib/api/client";
import { formatScore, highlightTerms } from "@/lib/utils/format";

describe("format utilities", () => {
  it("formats score in Korean", () => {
    expect(formatScore(72.4)).toBe("72점");
  });

  it("highlights dictionary terms", () => {
    const parts = highlightTerms("광주 AI 정책", ["AI"]);
    expect(parts.some((part) => part.text === "AI" && part.highlighted)).toBe(true);
  });

  it("repairs common UTF-8 mojibake", () => {
    expect(fixMojibake("ì ì±")).toBe("정책");
  });
});
