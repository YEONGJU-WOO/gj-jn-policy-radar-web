"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import type { RegionMetric } from "@/components/domain/region-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionBadge } from "@/components/ui/RegionBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateKST } from "@/lib/utils/format";
import type { AnalyticsRegionMatrix, Article } from "@/types/api";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type RegionSidePanelProps = {
  selected?: RegionMetric;
  articles: Article[];
  agendas: string[];
  loading: boolean;
  matrix?: AnalyticsRegionMatrix;
};

export function RegionSidePanel({
  selected,
  articles,
  agendas,
  loading,
  matrix,
}: RegionSidePanelProps) {
  const agendaDistribution = useMemo(() => {
    if (!selected) return [];
    if (matrix) {
      const rowIndex = matrix.rows.findIndex(
        (row) => row === selected.name || row === selected.code || selected.name.includes(row),
      );
      if (rowIndex >= 0) {
        const byMatrix = matrix.cols.map((agenda, colIndex) => ({
          name: agenda,
          value: matrix.values[rowIndex]?.[colIndex] ?? 0,
        }));
        if (byMatrix.some((item) => item.value > 0)) return byMatrix;
      }
    }

    const counts = new Map<string, number>();
    for (const article of articles) {
      const key = article.category || article.publisher || "기타";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [articles, matrix, selected]);

  const topAgenda =
    agendaDistribution.length > 0
      ? [...agendaDistribution].sort((a, b) => b.value - a.value)[0]?.name
      : selected?.topAgenda;

  const dialogAgenda = agendas.length === 1 ? agendas[0] : undefined;

  return (
    <aside className="h-fit lg:sticky lg:top-20">
      <Card>
        <CardHeader>
          <CardTitle>선택 지역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <RegionBadge region={selected.name} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <MetricBox
                    label="총 기사 수"
                    value={`${selected.articleCount.toLocaleString()}건`}
                  />
                  <MetricBox label="평균 점수" value={`${Math.round(selected.averageScore)}점`} />
                  <MetricBox label="상위 영역" value={topAgenda || "-"} />
                </div>
                {agendas.length ? (
                  <div className="flex flex-wrap gap-1">
                    {agendas.map((agenda) => (
                      <Badge key={agenda} variant="secondary">
                        {agenda}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <RelatedContentDialog
                  title={`${selected.name} 관련 내용`}
                  description="선택한 지역과 정책영역에 맞는 기사와 상세 내용을 현재 화면에서 확인합니다."
                  query={{ region: selected.name, agenda: dialogAgenda, limit: 30, offset: 0 }}
                  articles={articles}
                  trigger={<Button className="w-full">관련 내용 보기</Button>}
                />
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">영역별 분포</p>
                {agendaDistribution.some((item) => item.value > 0) ? (
                  <ReactECharts
                    option={{
                      textStyle: { fontFamily: "Pretendard, NanumGothic, sans-serif" },
                      tooltip: { trigger: "item" },
                      series: [
                        {
                          type: "pie",
                          radius: ["48%", "72%"],
                          avoidLabelOverlap: true,
                          label: { formatter: "{b}" },
                          data: agendaDistribution.filter((item) => item.value > 0),
                        },
                      ],
                    }}
                    style={{ height: 220, width: "100%" }}
                  />
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    영역별 분포 데이터가 아직 없습니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">해당 지역 기사</p>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
                    {articles.slice(0, 12).map((article) => (
                      <RelatedContentDialog
                        key={article.id}
                        title={`${selected.name} 관련 기사`}
                        articles={articles}
                        initialArticleId={article.id}
                        trigger={
                          <button
                            type="button"
                            className="rounded-md border p-3 text-left text-sm hover:bg-muted/50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 font-medium">{article.title}</p>
                              <Badge variant="outline">
                                {Math.round(article.relevance_score)}점
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>{article.category || article.publisher}</span>
                              <span>{formatDateKST(article.published_at_kst)}</span>
                            </div>
                          </button>
                        }
                      />
                    ))}
                    {!articles.length ? (
                      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        선택한 지역과 조건에 맞는 기사가 아직 없습니다.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
              지도에서 행정구역을 클릭하면 KPI, 영역 분포, 기사 목록이 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}
