"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { filterDefaults, useFilterStore } from "@/lib/stores/filter-store";

export function ActiveFilterChips({ onChanged }: { onChanged?: () => void }) {
  const filter = useFilterStore();
  const chips = [
    ...filter.sources.map((value) => ({ type: "source" as const, value })),
    ...filter.agendas.map((value) => ({ type: "agenda" as const, value })),
    ...filter.regions.map((value) => ({ type: "region" as const, value })),
    ...(filter.q ? [{ type: "q" as const, value: filter.q }] : []),
    ...(filter.minScore !== filterDefaults.minScore
      ? [{ type: "score" as const, value: `${filter.minScore}점 이상` }]
      : []),
  ];

  if (!chips.length) return null;

  function remove(type: (typeof chips)[number]["type"], value: string) {
    if (type === "source") filter.setSources(filter.sources.filter((item) => item !== value));
    if (type === "agenda") filter.setAgendas(filter.agendas.filter((item) => item !== value));
    if (type === "region") filter.setRegions(filter.regions.filter((item) => item !== value));
    if (type === "q") filter.setQuery("");
    if (type === "score") filter.setMinScore(filterDefaults.minScore);
    onChanged?.();
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="활성 필터">
      {chips.map((chip) => (
        <Badge key={`${chip.type}-${chip.value}`} variant="outline" className="gap-1">
          {chip.value}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            aria-label={`${chip.value} 필터 제거`}
            onClick={() => remove(chip.type, chip.value)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
