"use client";

import { RotateCcw, Save, Search, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveFilterChips } from "@/components/domain/explorer/FilterPanelParts";
import {
  AGENDAS,
  defaultDateRange,
  GWANGJU_REGIONS,
  JEONNAM_REGIONS,
  NATIONAL_REGIONS,
  REGION_GROUPS,
  SORT_OPTIONS,
  SOURCES,
} from "@/components/domain/explorer/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { filterDefaults, type ExplorerSort, useFilterStore } from "@/lib/stores/filter-store";
import type { Period } from "@/types/api";

type FilterPanelProps = {
  searchRef: React.RefObject<HTMLInputElement>;
  onChanged?: () => void;
};

export function FilterPanel({ searchRef, onChanged }: FilterPanelProps) {
  const filter = useFilterStore();
  const [regionSearch, setRegionSearch] = useState("");
  const [keywordDraft, setKeywordDraft] = useState(filter.q);

  useEffect(() => {
    setKeywordDraft(filter.q);
  }, [filter.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (keywordDraft !== filter.q) {
        filter.setQuery(keywordDraft);
        onChanged?.();
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filter, keywordDraft, onChanged]);

  const visibleGroups = useMemo(
    () =>
      REGION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((region) => region.includes(regionSearch.trim())),
      })).filter((group) => group.items.length > 0),
    [regionSearch],
  );

  function setPeriod(period: Period) {
    const range = defaultDateRange(period);
    filter.setPeriod(period);
    filter.setDateRange(range.from, range.to);
    onChanged?.();
  }

  function resetFilters() {
    filter.reset();
    const range = defaultDateRange(filterDefaults.period);
    filter.setDateRange(range.from, range.to);
    setKeywordDraft("");
    onChanged?.();
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>필터</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">기간</legend>
          <PeriodSelector value={filter.period} onChange={setPeriod} />
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="시작일"
              type="date"
              value={filter.from}
              onChange={(event) => {
                filter.setDateRange(event.target.value, filter.to);
                onChanged?.();
              }}
            />
            <Input
              aria-label="종료일"
              type="date"
              value={filter.to}
              onChange={(event) => {
                filter.setDateRange(filter.from, event.target.value);
                onChanged?.();
              }}
            />
          </div>
        </fieldset>

        <MultiCheck
          title="출처"
          items={SOURCES}
          values={filter.sources}
          onChange={(sources) => {
            filter.setSources(sources);
            onChanged?.();
          }}
        />

        <MultiCheck
          title="정책영역"
          items={AGENDAS}
          values={filter.agendas}
          onChange={(agendas) => {
            filter.setAgendas(agendas);
            onChanged?.();
          }}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">지역</legend>
          <Input
            value={regionSearch}
            onChange={(event) => setRegionSearch(event.target.value)}
            placeholder="지역 검색"
          />
          <div className="flex flex-wrap gap-2">
            <QuickRegionButton label="광주 전체" regions={GWANGJU_REGIONS} onChanged={onChanged} />
            <QuickRegionButton label="전남" regions={JEONNAM_REGIONS} onChanged={onChanged} />
            <QuickRegionButton
              label="타 광역지자체"
              regions={NATIONAL_REGIONS}
              onChanged={onChanged}
            />
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
            {visibleGroups.map((group) => (
              <RegionGroup
                key={group.title}
                title={group.title}
                items={group.items}
                values={filter.regions}
                onChange={(regions) => {
                  filter.setRegions(regions);
                  onChanged?.();
                }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="flex items-center justify-between text-sm font-medium">
            <span>점수 임계값</span>
            <span className="text-muted-foreground">{filter.minScore}점</span>
          </legend>
          <Slider
            value={[filter.minScore]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => filter.setMinScore(value ?? 0)}
            onValueCommit={() => onChanged?.()}
          />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">키워드</legend>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              placeholder="해상풍력, AI, 군공항 이전..."
              className="pl-9"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">정렬</legend>
          <Select
            value={filter.sort}
            onValueChange={(value) => {
              filter.setSort(value as ExplorerSort);
              onChanged?.();
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>

        <ActiveFilterChips onChanged={onChanged} />

        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("공유 URL을 복사했습니다.");
            }}
          >
            <Share2 className="h-4 w-4" />
            URL 공유
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => toast.success("현재 검색 조건을 저장했습니다.")}
          >
            <Save className="h-4 w-4" />
            검색 저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickRegionButton({
  label,
  regions,
  onChanged,
}: {
  label: string;
  regions: string[];
  onChanged?: () => void;
}) {
  const filter = useFilterStore();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        filter.setRegions(regions);
        onChanged?.();
      }}
    >
      {label}
    </Button>
  );
}

function MultiCheck({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="grid gap-1">
        {items.map((item) => (
          <CheckItem
            key={item}
            item={item}
            checked={values.includes(item)}
            onChange={onChange}
            values={values}
          />
        ))}
      </div>
    </fieldset>
  );
}

function RegionGroup({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {items.map((item) => (
        <CheckItem
          key={item}
          item={item}
          checked={values.includes(item)}
          onChange={onChange}
          values={values}
        />
      ))}
    </div>
  );
}

function CheckItem({
  item,
  checked,
  values,
  onChange,
}: {
  item: string;
  checked: boolean;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={() =>
          onChange(checked ? values.filter((value) => value !== item) : [...values, item])
        }
      />
      {item}
    </label>
  );
}
