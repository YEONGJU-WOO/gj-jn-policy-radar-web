"use client";

import { Filter } from "lucide-react";

import { AGENDAS } from "@/components/domain/explorer/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiPeriod } from "@/types/api";

export type MapMetric = "count" | "sentiment" | "diversity";

type MapControlsProps = {
  metric: MapMetric;
  period: ApiPeriod;
  agendas: string[];
  onMetricChange: (metric: MapMetric) => void;
  onPeriodChange: (period: ApiPeriod) => void;
  onAgendasChange: (agendas: string[]) => void;
};

const metricOptions: Array<{ value: MapMetric; label: string }> = [
  { value: "count", label: "기사 빈도" },
  { value: "sentiment", label: "평균 감성" },
  { value: "diversity", label: "이슈 다양성 지수" },
];

const periodOptions: Array<{ value: ApiPeriod; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
  { value: "30d", label: "30일" },
];

export const agendaOptions = AGENDAS;

export function MapControls({
  metric,
  period,
  agendas,
  onMetricChange,
  onPeriodChange,
  onAgendasChange,
}: MapControlsProps) {
  function toggleAgenda(agenda: string) {
    onAgendasChange(
      agendas.includes(agenda) ? agendas.filter((item) => item !== agenda) : [...agendas, agenda],
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">지역 필터</p>
            <p className="text-xs text-muted-foreground">
              측정값, 기간, 정책영역을 조합해 지도와 관련 기사 목록을 갱신합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={metric} onValueChange={(value) => onMetricChange(value as MapMetric)}>
            <SelectTrigger className="w-44">
              <SelectValue aria-label="측정값" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(value) => onPeriodChange(value as ApiPeriod)}>
            <SelectTrigger className="w-28">
              <SelectValue aria-label="기간" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex max-w-full flex-wrap gap-1.5">
            {agendaOptions.map((agenda) => (
              <Button
                key={agenda}
                type="button"
                variant={agendas.includes(agenda) ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => toggleAgenda(agenda)}
              >
                {agenda}
              </Button>
            ))}
            {!agendas.length ? <Badge variant="outline">전체 영역</Badge> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
