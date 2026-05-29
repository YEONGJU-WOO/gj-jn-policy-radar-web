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
  "대해",
  "대한",
  "위해",
  "위한",
  "통해",
  "따라",
  "따른",
  "따르",
  "위하",
  "하는",
  "하며",
  "하고",
  "하면",
  "에서",
  "으로",
  "에게",
  "보다",
  "까지",
  "부터",
  "처럼",
  "지난",
  "올해",
  "내년",
  "이번",
  "최근",
  "현재",
  "뉴스",
  "기사",
  "자료",
  "발표",
  "제공",
]);

const STOPWORD_SUFFIXES = [
  "에서",
  "으로",
  "에게",
  "부터",
  "까지",
  "처럼",
  "보다",
  "이다",
  "이며",
  "하고",
  "하며",
];

const PARTICLE_SUFFIXES = [
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
  "의",
  "와",
  "과",
  "도",
];

export function isMeaningfulKoreanKeyword(term: string) {
  const normalized = normalizeKeywordTerm(term).toLowerCase();
  if (normalized.length < 2 || /^\d+$/.test(normalized)) return false;
  if (STOPWORDS.has(normalized)) return false;
  return !STOPWORD_SUFFIXES.some(
    (suffix) => normalized.endsWith(suffix) && normalized.length <= suffix.length + 2,
  );
}

export function filterMeaningfulKeywords<T extends string>(terms: T[]) {
  return terms.filter(isMeaningfulKoreanKeyword);
}

export function normalizeKeywordTerm(term: string) {
  const normalized = term.trim();
  for (const suffix of PARTICLE_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 1) {
      return normalized.slice(0, -suffix.length);
    }
  }
  return normalized;
}
