import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { FilterPanel } from "@/components/domain/explorer/FilterPanel";
import { defaultDateRange } from "@/components/domain/explorer/constants";
import { filterDefaults, useFilterStore } from "@/lib/stores/filter-store";

describe("FilterPanel", () => {
  beforeEach(() => {
    const range = defaultDateRange("7d");
    useFilterStore.setState({ ...filterDefaults, from: range.from, to: range.to });
    window.history.replaceState(null, "", "/explorer");
  });

  it("updates URL when a filter changes", async () => {
    const user = userEvent.setup();
    const ref = { current: null };
    render(<FilterPanel searchRef={ref} onChanged={() => useFilterStore.getState().syncToUrl()} />);

    await user.click(screen.getByLabelText("정책브리핑"));

    expect(decodeURIComponent(window.location.search)).toContain("sources=정책브리핑");
  });

  it("shows national regions and updates agenda filters", async () => {
    const user = userEvent.setup();
    const ref = { current: null };
    render(<FilterPanel searchRef={ref} onChanged={() => useFilterStore.getState().syncToUrl()} />);

    expect(screen.getByText("서울")).toBeInTheDocument();
    expect(screen.getByText("부산")).toBeInTheDocument();

    await user.click(screen.getByLabelText("산업"));

    expect(useFilterStore.getState().agendas).toContain("산업");
    expect(decodeURIComponent(window.location.search)).toContain("agendas=산업");
  });
});

describe("explorer filter URL sync", () => {
  it("reads the latest store state after a setter runs", () => {
    useFilterStore.setState({ ...filterDefaults, agendas: [] });
    useFilterStore.getState().setAgendas(["산업"]);

    const state = useFilterStore.getState();

    expect(state.agendas).toEqual(["산업"]);
  });
});
