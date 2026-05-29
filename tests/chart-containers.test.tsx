import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EChart } from "@/components/charts/echart";

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="echarts-container" />,
}));

describe("chart containers", () => {
  it("renders the EChart wrapper container", () => {
    render(<EChart option={{ xAxis: {}, yAxis: {}, series: [] }} ariaLabel="테스트 차트" />);

    expect(screen.getByRole("img", { name: "테스트 차트" })).toBeInTheDocument();
  });
});
