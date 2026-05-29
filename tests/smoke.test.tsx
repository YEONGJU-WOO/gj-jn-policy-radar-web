import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("ui smoke", () => {
  it("renders a badge", () => {
    render(React.createElement(Badge, null, "정책"));
    expect(screen.getByText("정책")).toBeInTheDocument();
  });
});
