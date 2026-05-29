import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { useExplorerHotkeys } from "@/components/domain/explorer/useExplorerHotkeys";
import { mockArticles } from "./msw/handlers";

function HotkeyHarness() {
  const [selectedId, setSelectedId] = useState<number | undefined>(mockArticles[0].id);
  const searchRef = useRef<HTMLInputElement>(null);
  useExplorerHotkeys({
    searchRef,
    articles: mockArticles,
    selectedId,
    onSelectArticle: setSelectedId,
    onBookmark: () => undefined,
    onCloseDetail: () => setSelectedId(undefined),
    onOpenHelp: () => undefined,
  });

  return (
    <div>
      <input ref={searchRef} aria-label="검색" />
      <span data-testid="selected">{selectedId ?? "none"}</span>
    </div>
  );
}

describe("useExplorerHotkeys", () => {
  it("moves selection with j and k", async () => {
    const user = userEvent.setup();
    render(<HotkeyHarness />);

    await user.keyboard("j");
    expect(screen.getByTestId("selected")).toHaveTextContent("2");

    await user.keyboard("k");
    expect(screen.getByTestId("selected")).toHaveTextContent("1");
  });
});
