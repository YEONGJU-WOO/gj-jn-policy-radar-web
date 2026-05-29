"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  explorer: "이슈 익스플로러",
  trends: "트렌드 & 토픽",
  map: "지역 지도",
  reports: "리포트",
  admin: "관리자",
  login: "로그인",
};

export function Breadcrumb() {
  const parts = usePathname().split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="현재 위치">
      <span>홈</span>
      {parts.map((part) => (
        <span className="flex items-center gap-1" key={part}>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          {labels[part] ?? part}
        </span>
      ))}
    </nav>
  );
}
