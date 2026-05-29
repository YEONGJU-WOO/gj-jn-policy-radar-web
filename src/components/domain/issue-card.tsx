import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKst } from "@/lib/utils/date";
import type { Article } from "@/types/api";

export function IssueCard({ article }: { article: Article }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-6">{article.title}</CardTitle>
          <Badge variant={article.relevance_score >= 70 ? "warning" : "secondary"}>
            {Math.round(article.relevance_score)}점
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {article.summary || "요약이 준비 중입니다."}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{article.source_name}</Badge>
          <Badge variant="outline">{article.category}</Badge>
          <span>{formatKst(article.published_at_kst)} KST</span>
          <a
            className="inline-flex items-center gap-1 text-primary"
            href={article.url}
            target="_blank"
            rel="noreferrer"
          >
            원문 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
