"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/lib/stores/filter-store";
import type { Period } from "@/types/api";

const periods: Array<{ value: Period; label: string }> = [
  { value: "today", label: "오늘" },
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
];

type PeriodSelectorProps = {
  value?: Period;
  onChange?: (value: Period) => void;
};

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const storePeriod = useFilterStore((state) => state.period);
  const setPeriod = useFilterStore((state) => state.setPeriod);
  const syncToUrl = useFilterStore((state) => state.syncToUrl);
  const current = value ?? storePeriod;

  return (
    <Select
      value={current}
      onValueChange={(next) => {
        const period = next as Period;
        if (onChange) onChange(period);
        else {
          setPeriod(period);
          window.setTimeout(syncToUrl, 0);
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="기간" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
