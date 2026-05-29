"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  ["/", "검색 입력창으로 이동"],
  ["j", "다음 행 선택"],
  ["k", "이전 행 선택"],
  ["Enter", "현재 행 상세 보기"],
  ["b", "현재 기사 북마크"],
  ["Esc", "상세 패널 닫기"],
  ["?", "단축키 도움말 열기"],
];

export function ShortcutHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>단축키 도움말</DialogTitle>
          <DialogDescription>
            이슈 익스플로러에서 사용할 수 있는 키보드 단축키입니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {shortcuts.map(([key, description]) => (
            <div
              key={key}
              className="grid grid-cols-[80px_1fr] items-center gap-3 rounded-md border p-3"
            >
              <kbd className="rounded bg-muted px-2 py-1 text-center text-xs font-semibold">
                {key}
              </kbd>
              <span className="text-sm">{description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
