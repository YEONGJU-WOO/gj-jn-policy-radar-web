"use client";

import { Clock, DatabaseZap } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobStatus } from "@/lib/hooks/use-api";
import { countdownTo, formatKst } from "@/lib/utils/date";

export function StatusBar() {
  const { lastRun, nextRun } = useJobStatus();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = lastRun.data?.data?.[0]?.started_at_kst ?? null;
  const next = nextRun.data?.data?.next_fire_time_kst ?? null;
  void now;

  if (lastRun.isLoading || nextRun.isLoading) {
    return <Skeleton className="hidden h-8 w-80 xl:block" />;
  }

  return (
    <div className="hidden flex-wrap items-center gap-2 xl:flex">
      <Badge variant="outline" className="gap-1.5">
        <DatabaseZap className="h-3.5 w-3.5" aria-hidden="true" />
        마지막 수집: {formatKst(latest)} KST
      </Badge>
      <Badge variant="warning" className="gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        다음 실행까지: {countdownTo(next)}
      </Badge>
    </div>
  );
}
