"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { TREND_COLORS } from "@/components/domain/trends/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isMeaningfulKoreanKeyword } from "@/lib/utils/korean-stopwords";

export function KeywordSelector({
  value,
  suggestions,
  onChange,
  max = 8,
}: {
  value: string[];
  suggestions: string[];
  onChange: (keywords: string[]) => void;
  max?: number;
}) {
  const [input, setInput] = useState("");
  const filtered = useMemo(() => {
    const keyword = input.trim();
    return suggestions
      .filter((term) => term && !value.includes(term))
      .filter(isMeaningfulKoreanKeyword)
      .filter((term) => !keyword || term.includes(keyword))
      .slice(0, 8);
  }, [input, suggestions, value]);

  function add(term: string) {
    const clean = term.trim();
    if (!clean || !isMeaningfulKoreanKeyword(clean) || value.includes(clean) || value.length >= max)
      return;
    onChange([...value, clean]);
    setInput("");
  }

  function remove(term: string) {
    onChange(value.filter((item) => item !== term));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {value.map((keyword, index) => (
          <Badge key={keyword} variant="outline" className="gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TREND_COLORS[index % TREND_COLORS.length] }}
            />
            {keyword}
            <button type="button" aria-label={`${keyword} 삭제`} onClick={() => remove(keyword)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="키워드 입력"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(input);
            }
          }}
          placeholder="키워드를 입력하고 Enter"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => add(input)}
          disabled={value.length >= max}
        >
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((term) => (
          <button
            key={term}
            type="button"
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => add(term)}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
