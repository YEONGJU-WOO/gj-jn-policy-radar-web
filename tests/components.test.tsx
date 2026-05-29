import type { ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/components/ui/DataTable";
import { ScoreBar } from "@/components/ui/ScoreBar";

describe("dashboard components", () => {
  it("renders ScoreBar with accessible Korean label", () => {
    render(<ScoreBar score={67} />);
    expect(screen.getByLabelText("관련성 67점")).toBeInTheDocument();
  });

  it("renders DataTable rows", () => {
    const columns: ColumnDef<{ title: string; score: number }>[] = [
      { accessorKey: "title", header: "제목" },
      { accessorKey: "score", header: "점수" },
    ];
    render(<DataTable data={[{ title: "광주 AI 정책", score: 88 }]} columns={columns} />);
    expect(screen.getByText("광주 AI 정책")).toBeInTheDocument();
    expect(screen.getByText("열 설정")).toBeInTheDocument();
  });
});
