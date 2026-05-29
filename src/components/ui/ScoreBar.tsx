import { formatScore } from "@/lib/utils/format";

export function ScoreBar({ score, compact = false }: { score: number; compact?: boolean }) {
  const value = Math.max(0, Math.min(100, score));

  return (
    <div className={compact ? "min-w-24" : "min-w-28"} aria-label={`관련성 ${formatScore(value)}`}>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>관련성</span>
        <span>{formatScore(value)}</span>
      </div>
      <div className={`${compact ? "h-1.5" : "h-2"} overflow-hidden rounded-full bg-muted`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-600 via-emerald-600 to-amber-600"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
