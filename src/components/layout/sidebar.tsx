"use client";

import { BarChart3, FileText, Home, Map, Network, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

export const navItems = [
  { href: "/", label: "오늘의 브리핑", icon: Home },
  { href: "/explorer", label: "이슈 익스플로러", icon: Network },
  { href: "/trends", label: "트렌드 & 토픽", icon: BarChart3 },
  { href: "/map", label: "지역 지도", icon: Map },
  { href: "/reports", label: "리포트", icon: FileText },
  { href: "/admin", label: "관리자", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="h-full w-64 shrink-0 border-r bg-card">
      <div className="flex h-16 items-center border-b px-5">
        <div>
          <p className="text-sm text-muted-foreground">GJ-JN</p>
          <h1 className="text-base font-semibold">정책 레이더</h1>
        </div>
      </div>
      <nav className="space-y-1 p-3" aria-label="주요 메뉴">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                active &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
