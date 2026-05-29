import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KeywordSelector } from "@/components/domain/trends/KeywordSelector";

describe("KeywordSelector", () => {
  it("adds a suggested keyword and removes a chip", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <KeywordSelector
        value={["AI"]}
        suggestions={["AI", "해상풍력", "교통"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText("해상풍력"));
    expect(onChange).toHaveBeenCalledWith(["AI", "해상풍력"]);

    rerender(
      <KeywordSelector
        value={["AI", "해상풍력"]}
        suggestions={["AI", "해상풍력", "교통"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText("AI 삭제"));
    expect(onChange).toHaveBeenLastCalledWith(["해상풍력"]);
  });

  it("adds a typed keyword with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KeywordSelector value={[]} suggestions={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText("키워드 입력"), "군공항 이전{Enter}");

    expect(onChange).toHaveBeenCalledWith(["군공항 이전"]);
  });
});
