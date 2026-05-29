"use client";

import { Badge } from "@/components/ui/badge";
import { useFilterStore } from "@/lib/stores/filter-store";

export function KeywordChip({ keyword }: { keyword: string }) {
  const setQuery = useFilterStore((state) => state.setQuery);
  const syncToUrl = useFilterStore((state) => state.syncToUrl);
  return (
    <button
      type="button"
      onClick={() => {
        setQuery(keyword);
        window.setTimeout(syncToUrl, 0);
      }}
    >
      <Badge variant="outline" className="hover:bg-muted">
        {keyword}
      </Badge>
    </button>
  );
}
