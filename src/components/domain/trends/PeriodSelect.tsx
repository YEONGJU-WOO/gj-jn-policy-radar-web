"use client";

import { PERIODS } from "@/components/domain/trends/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiPeriod } from "@/types/api";

export function PeriodSelect({
  value,
  onChange,
  periods = PERIODS,
}: {
  value: ApiPeriod;
  onChange: (value: ApiPeriod) => void;
  periods?: Array<{ value: ApiPeriod; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ApiPeriod)}>
      <SelectTrigger className="w-full min-w-32">
        <SelectValue />
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
