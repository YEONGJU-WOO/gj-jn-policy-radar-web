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

type FilterState = {
  period: Period;
  source: string;
  agenda: string;
  region: string;
  minScore: number;
  q: string;
  setPeriod: (period: Period) => void;
  setSource: (source: string) => void;
  setAgenda: (agenda: string) => void;
  setRegion: (region: string) => void;
  setMinScore: (score: number) => void;
  setQuery: (q: string) => void;
  reset: () => void;
  toArticleQuery: () => {
    min_score: number;
    region?: string;
    agenda?: string;
    q?: string;
    limit: number;
  };
  toApiPeriod: () => ApiPeriod;
  toRegionLevel: () => RegionLevel;
  syncToUrl: () => void;
  hydrateFromUrl: (searchParams: URLSearchParams) => void;
};

const defaults = {
  period: "14d" as Period,
  source: "",
  agenda: "",
  region: "",
  minScore: 30,
  q: "",
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...defaults,
  setPeriod: (period) => set({ period }),
  setSource: (source) => set({ source }),
  setAgenda: (agenda) => set({ agenda }),
  setRegion: (region) => set({ region }),
  setMinScore: (minScore) => set({ minScore }),
  setQuery: (q) => set({ q }),
  reset: () => set(defaults),
  toArticleQuery: () => {
    const state = get();
    return {
      min_score: state.minScore,
      region: state.region || undefined,
      agenda: state.agenda || undefined,
      q: state.q || undefined,
      limit: 50,
    };
  },
  toApiPeriod: () => {
    const period = get().period;
    return period === "today" ? "7d" : period;
  },
  toRegionLevel: () => (get().region.includes("전남") ? "jeonnam" : "gwangju"),
  syncToUrl: () => {
    if (typeof window === "undefined") return;
    const state = get();
    const params = new URLSearchParams();
    Object.entries({
      period: state.period,
      source: state.source,
      agenda: state.agenda,
      region: state.region,
      minScore: state.minScore,
      q: state.q,
    }).forEach(([key, value]) => {
      if (value !== "" && value !== defaults[key as keyof typeof defaults]) {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  },
  hydrateFromUrl: (searchParams) =>
    set({
      period: (searchParams.get("period") as Period) || defaults.period,
      source: searchParams.get("source") || defaults.source,
      agenda: searchParams.get("agenda") || defaults.agenda,
      region: searchParams.get("region") || defaults.region,
      minScore: Number(searchParams.get("minScore") || defaults.minScore),
      q: searchParams.get("q") || defaults.q,
    }),
}));
