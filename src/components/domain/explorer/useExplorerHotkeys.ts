"use client";

import { useHotkeys } from "react-hotkeys-hook";

import type { Article } from "@/types/api";

type ExplorerHotkeyArgs = {
  searchRef: React.RefObject<HTMLInputElement>;
  articles: Article[];
  selectedId?: number;
  onSelectArticle: (id: number) => void;
  onBookmark: (ids: number[]) => void;
  onCloseDetail: () => void;
  onOpenHelp: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || element?.isContentEditable
  );
}

export function useExplorerHotkeys({
  searchRef,
  articles,
  selectedId,
  onSelectArticle,
  onBookmark,
  onCloseDetail,
  onOpenHelp,
}: ExplorerHotkeyArgs) {
  const selectedIndex = Math.max(
    0,
    articles.findIndex((article) => article.id === selectedId),
  );

  useHotkeys(
    "/",
    (event) => {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
    },
    { enableOnFormTags: false },
    [searchRef],
  );

  useHotkeys(
    "j",
    (event) => {
      if (isTypingTarget(event.target) || !articles.length) return;
      event.preventDefault();
      const next = articles[Math.min(selectedIndex + 1, articles.length - 1)];
      if (next) onSelectArticle(next.id);
    },
    { enableOnFormTags: false },
    [articles, selectedIndex, onSelectArticle],
  );

  useHotkeys(
    "k",
    (event) => {
      if (isTypingTarget(event.target) || !articles.length) return;
      event.preventDefault();
      const previous = articles[Math.max(selectedIndex - 1, 0)];
      if (previous) onSelectArticle(previous.id);
    },
    { enableOnFormTags: false },
    [articles, selectedIndex, onSelectArticle],
  );

  useHotkeys(
    "enter",
    (event) => {
      if (isTypingTarget(event.target) || !articles.length) return;
      event.preventDefault();
      const current = articles[selectedIndex];
      if (current) onSelectArticle(current.id);
    },
    { enableOnFormTags: false },
    [articles, selectedIndex, onSelectArticle],
  );

  useHotkeys(
    "b",
    (event) => {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      const current = selectedId
        ? articles.find((article) => article.id === selectedId)
        : articles[selectedIndex];
      if (current) onBookmark([current.id]);
    },
    { enableOnFormTags: false },
    [articles, selectedId, selectedIndex, onBookmark],
  );

  useHotkeys(
    "esc",
    (event) => {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      onCloseDetail();
    },
    { enableOnFormTags: false },
    [onCloseDetail],
  );

  useHotkeys(
    "?",
    (event) => {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      onOpenHelp();
    },
    { enableOnFormTags: false },
    [onOpenHelp],
  );
}
