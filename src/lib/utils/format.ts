import { API_BASE_URL } from "@/lib/api/client";
import { formatKst } from "@/lib/utils/date";

export function formatDateKST(date?: string | null) {
  return formatKst(date);
}

export function formatScore(num?: number | null) {
  if (num === undefined || num === null || Number.isNaN(num)) return "0점";
  return `${Math.round(num)}점`;
}

export function highlightTerms(text: string, terms: string[]) {
  if (!terms.length) return [{ text, highlighted: false }];
  const escaped = terms.filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return [{ text, highlighted: false }];
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(pattern).map((part) => ({
    text: part,
    highlighted: terms.some((term) => term.toLowerCase() === part.toLowerCase()),
  }));
}

export async function downloadBlob(url: string, filename: string) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl);
  if (!response.ok) throw new Error("파일 다운로드에 실패했습니다.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
