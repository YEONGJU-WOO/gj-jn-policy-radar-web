import { create } from "zustand";

import type { ApiPeriod, Period, RegionLevel } from "@/types/api";

type UIState = {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: UIState["theme"]) => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: "system",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}));

export const useUiStore = useUIStore;

export type ExplorerSort = "score_desc" | "published_desc" | "published_asc" | "relevance_desc";

type FilterState = {
  period: Period;
  from: string;
  to: string;
  sources: string[];
  agendas: string[];
  regions: string[];
  minScore: number;
  q: string;
  sort: ExplorerSort;
  setPeriod: (period: Period) => void;
  setDateRange: (from: string, to: string) => void;
  setSources: (sources: string[]) => void;
  setAgendas: (agendas: string[]) => void;
  setRegions: (regions: string[]) => void;
  setMinScore: (score: number) => void;
  setQuery: (q: string) => void;
  setSort: (sort: ExplorerSort) => void;
  reset: () => void;
  toArticleQuery: () => {
    from?: string;
    to?: string;
    min_score: number;
    region?: string;
    agenda?: string;
    q?: string;
    limit: number;
    offset: number;
  };
  toApiPeriod: () => ApiPeriod;
  toRegionLevel: () => RegionLevel;
  syncToUrl: () => void;
  hydrateFromUrl: (searchParams: URLSearchParams) => void;
};

export const filterDefaults = {
  period: "7d" as Period,
  from: "",
  to: "",
  sources: [] as string[],
  agendas: [] as string[],
  regions: [] as string[],
  minScore: 0,
  q: "",
  sort: "score_desc" as ExplorerSort,
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...filterDefaults,
  setPeriod: (period) => set({ period }),
  setDateRange: (from, to) => set({ from, to }),
  setSources: (sources) => set({ sources }),
  setAgendas: (agendas) => set({ agendas }),
  setRegions: (regions) => set({ regions }),
  setMinScore: (minScore) => set({ minScore }),
  setQuery: (q) => set({ q }),
  setSort: (sort) => set({ sort }),
  reset: () => set(filterDefaults),
  toArticleQuery: () => {
    const state = get();
    return {
      from: state.from || undefined,
      to: state.to || undefined,
      min_score: state.minScore,
      q: state.q || undefined,
      limit: 200,
      offset: 0,
    };
  },
  toApiPeriod: () => {
    const period = get().period;
    return period === "today" ? "7d" : period;
  },
  toRegionLevel: () =>
    get().regions.some((region) => region.includes("전남")) ? "jeonnam" : "gwangju",
  syncToUrl: () => {
    if (typeof window === "undefined") return;
    const state = get();
    const params = new URLSearchParams();
    if (state.from) params.set("from", state.from);
    if (state.to) params.set("to", state.to);
    if (state.sources.length) params.set("sources", state.sources.join(","));
    if (state.agendas.length) params.set("agendas", state.agendas.join(","));
    if (state.regions.length) params.set("regions", state.regions.join(","));
    if (state.minScore !== filterDefaults.minScore) params.set("min_score", String(state.minScore));
    if (state.q) params.set("q", state.q);
    if (state.sort !== filterDefaults.sort) params.set("sort", state.sort);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  },
  hydrateFromUrl: (searchParams) =>
    set({
      period: (searchParams.get("period") as Period) || filterDefaults.period,
      from: searchParams.get("from") || filterDefaults.from,
      to: searchParams.get("to") || filterDefaults.to,
      sources: splitParam(searchParams.get("sources") || searchParams.get("source")),
      agendas: splitParam(searchParams.get("agendas") || searchParams.get("agenda")),
      regions: splitParam(searchParams.get("regions") || searchParams.get("region")),
      minScore: Number(searchParams.get("min_score") || filterDefaults.minScore),
      q: searchParams.get("q") || filterDefaults.q,
      sort: (searchParams.get("sort") as ExplorerSort) || filterDefaults.sort,
    }),
}));

function splitParam(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}
