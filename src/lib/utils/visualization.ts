import dayjs from "dayjs";

import type { TrendKeywordResponse } from "@/types/api";

export function lastNDates(days: number) {
  return Array.from({ length: days }, (_, index) =>
    dayjs()
      .subtract(days - index - 1, "day")
      .format("YYYY-MM-DD"),
  );
}

export function trendToSeries(response: TrendKeywordResponse, days: number) {
  const dates = lastNDates(days);
  const entries = Object.entries(response);

  if (!entries.length) {
    return {
      AI: dates.map((date, index) => ({
        date,
        value: Math.round(4 + Math.sin(index / 2) * 3 + index / 3),
      })),
      해상풍력: dates.map((date, index) => ({
        date,
        value: Math.round(3 + Math.cos(index / 3) * 2 + index / 4),
      })),
      교통: dates.map((date, index) => ({
        date,
        value: Math.round(2 + Math.sin(index / 4) * 2 + index / 5),
      })),
    };
  }

  return Object.fromEntries(
    entries.map(([term, values]) => [
      term,
      dates.map((date) => ({ date, value: Number(values[date] ?? 0) })),
    ]),
  );
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
