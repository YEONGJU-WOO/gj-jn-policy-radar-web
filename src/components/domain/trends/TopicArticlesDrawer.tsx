"use client";

import { RelatedContentDialog } from "@/components/domain/related-content-dialog";
import { Badge } from "@/components/ui/badge";
import type { Article, Topic } from "@/types/api";

export function TopicArticlesDrawer({ topic, articles }: { topic?: Topic; articles: Article[] }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{topic?.label ?? "토픽을 선택하세요"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {topic?.keywords.slice(0, 5).join(", ") ||
              "산점도의 점을 클릭하면 관련 기사가 표시됩니다."}
          </p>
        </div>
        {topic ? <Badge variant="outline">{topic.article_count}건</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {articles.slice(0, 6).map((article) => (
          <RelatedContentDialog
            key={article.id}
            title={topic?.label ?? "토픽 관련 기사"}
            description="선택한 토픽의 관련 기사와 상세 내용을 현재 화면에서 확인합니다."
            articles={articles}
            initialArticleId={article.id}
            trigger={
              <button
                type="button"
                className="rounded-md border p-3 text-left text-sm hover:bg-muted/50"
              >
                <p className="line-clamp-2 font-medium">{article.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  관련성 {Math.round(article.relevance_score)}점
                </p>
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
