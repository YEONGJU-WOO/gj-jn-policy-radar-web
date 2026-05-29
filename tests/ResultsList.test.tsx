import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResultsList } from "@/components/domain/explorer/ResultsList";
import { mockArticles } from "./msw/handlers";

describe("ResultsList", () => {
  it("updates article_id in URL when a row is clicked", async () => {
    const user = userEvent.setup();
    const onSelectArticle = vi.fn((id: number) => {
      window.history.replaceState(null, "", `/explorer?article_id=${id}`);
    });

    render(
      <ResultsList
        articles={mockArticles}
        total={mockArticles.length}
        appliedFilterCount={1}
        loading={false}
        selectedRows={new Set()}
        page={0}
        pageSize={20}
        onSelectArticle={onSelectArticle}
        onToggleRow={vi.fn()}
        onTogglePage={vi.fn()}
        onBookmark={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("article-row-1"));

    expect(onSelectArticle).toHaveBeenCalledWith(1);
    expect(window.location.search).toBe("?article_id=1");
  });
});
