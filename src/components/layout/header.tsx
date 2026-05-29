"use client";

import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/button";

export function Header({ onMenu }: { onMenu: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-background px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="메뉴 열기"
          onClick={onMenu}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">광주·전남 정책 현안 모니터링</p>
          <h2 className="truncate text-lg font-semibold">정책 의사결정 대시보드</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBar />
        <Button
          variant="outline"
          size="icon"
          aria-label="다크모드 전환"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
      </div>
    </header>
  );
}
