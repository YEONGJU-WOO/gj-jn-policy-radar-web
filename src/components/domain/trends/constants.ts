import type { ApiPeriod } from "@/types/api";

export const PERIODS: Array<{ value: ApiPeriod; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
];

export const TOPIC_PERIODS: Array<{ value: ApiPeriod; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
];

export const TREND_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#be185d",
  "#4f46e5",
];

export const DEFAULT_KEYWORDS = ["AI", "해상풍력", "교통"];
