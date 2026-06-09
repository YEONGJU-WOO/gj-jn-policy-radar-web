const STOPWORDS = new Set([
  "그리고",
  "그러나",
  "하지만",
  "또는",
  "또한",
  "및",
  "등",
  "등의",
  "관련",
  "대한",
  "대해",
  "위해",
  "위한",
  "통해",
  "따라",
  "따른",
  "따르",
  "하는",
  "하며",
  "하고",
  "하면",
  "현재",
  "최근",
  "이번",
  "지역",
  "오늘",
  "내일",
  "어제",
  "기사",
  "자료",
  "발표",
  "제공",
  "본문",
  "내용",
  "요약",
  "출처",
  "광고",
  "기자",
  "연합뉴스",
  "광주일보",
  "정책브리핑",
  "카카오톡",
  "제보",
  "무단",
  "배포",
  "금지",
  "포함",
  "사용",
  "전체",
  "함께",
  "경우",
  "인해",
  "아니다",
  "밝혔다",
  "명시",
]);

const STOPWORD_SUFFIXES = ["에서", "으로", "에게", "부터", "까지", "처럼", "보다"];

const PARTICLE_SUFFIXES = [
  "에서는",
  "으로는",
  "에게는",
  "에서",
  "으로",
  "에게",
  "부터",
  "까지",
  "처럼",
  "보다",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "와",
  "과",
  "도",
  "만",
];

export function isMeaningfulKoreanKeyword(term: string) {
  const normalized = normalizeKeywordTerm(term).toLowerCase();
  if (normalized.length < 2 || /^\d+$/.test(normalized)) return false;
  if (/^[a-z0-9._-]+$/i.test(normalized) && normalized.length > 12) return false;
  if (STOPWORDS.has(normalized)) return false;
  return !STOPWORD_SUFFIXES.some(
    (suffix) => normalized.endsWith(suffix) && normalized.length <= suffix.length + 2,
  );
}

export function filterMeaningfulKeywords<T extends string>(terms: T[]) {
  return terms.filter(isMeaningfulKoreanKeyword);
}

export function normalizeKeywordTerm(term: string) {
  let normalized = term.trim();
  for (const suffix of PARTICLE_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 1) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  return normalized;
}
