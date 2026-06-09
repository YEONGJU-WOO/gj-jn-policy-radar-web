import dayjs from "dayjs";

import type { ExplorerSort } from "@/lib/stores/filter-store";
import type { Period } from "@/types/api";

export const SOURCES = ["정책브리핑", "연합뉴스", "광주일보"];

export const AGENDAS = ["에너지", "산업", "의료", "인구", "교통", "농수산", "문화관광"];

export const GWANGJU_DISTRICTS = ["동구", "서구", "남구", "북구", "광산구"];

export const GWANGJU_REGIONS = ["광주 전체", ...GWANGJU_DISTRICTS];

export const JEONNAM_REGIONS = ["전남"];

export const JEONNAM_COUNTIES = [
  "목포",
  "여수",
  "순천",
  "나주",
  "광양",
  "담양",
  "곡성",
  "구례",
  "고흥",
  "보성",
  "화순",
  "장흥",
  "강진",
  "해남",
  "영암",
  "무안",
  "함평",
  "영광",
  "장성",
  "완도",
  "진도",
  "신안",
];

export const OTHER_METRO_REGIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "경북",
  "경남",
  "제주",
];

export const NATIONAL_REGIONS = OTHER_METRO_REGIONS;

export const REGION_GROUPS = [
  { title: "광주", items: GWANGJU_REGIONS },
  { title: "전남", items: JEONNAM_REGIONS },
  { title: "타 광역지자체", items: OTHER_METRO_REGIONS },
];

export const ALL_REGIONS = [...GWANGJU_REGIONS, ...JEONNAM_REGIONS, ...OTHER_METRO_REGIONS];

export const SORT_OPTIONS: Array<{ value: ExplorerSort; label: string }> = [
  { value: "score_desc", label: "점수 내림차순" },
  { value: "published_desc", label: "발행시각 최신순" },
  { value: "published_asc", label: "발행시각 오래된순" },
  { value: "relevance_desc", label: "관련성 내림차순" },
];

export function defaultDateRange(period: Period) {
  const days: Record<Period, number> = { today: 0, "7d": 7, "14d": 14, "30d": 30 };
  return {
    from: dayjs().subtract(days[period], "day").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  };
}

export function splitCsv(value?: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}
