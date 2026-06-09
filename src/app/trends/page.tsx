"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { TrendsTabsHeader } from "@/components/domain/trends/TrendsTabsHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";

const KeywordTrendsTab = dynamic(
  () => import("@/components/domain/trends/KeywordTrendsTab").then((mod) => mod.KeywordTrendsTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const TopicMapTab = dynamic(
  () => import("@/components/domain/trends/TopicMapTab").then((mod) => mod.TopicMapTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const WordCloudTab = dynamic(
  () => import("@/components/domain/trends/WordCloudTab").then((mod) => mod.WordCloudTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const CooccurrenceNetworkTab = dynamic(
  () =>
    import("@/components/domain/trends/CooccurrenceNetworkTab").then(
      (mod) => mod.CooccurrenceNetworkTab,
    ),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const LifecycleTab = dynamic(
  () => import("@/components/domain/trends/LifecycleTab").then((mod) => mod.LifecycleTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);

export default function TrendsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">트렌드 & 토픽</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          키워드 흐름, 토픽 군집, 워드클라우드, 동시출현 네트워크, 이슈 라이프사이클을 한 화면에서
          분석합니다.
        </p>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4">
        <TrendsTabsHeader />
        <TabsContent value="keywords">
          <Suspense fallback={<TabSkeleton />}>
            <KeywordTrendsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="topic-map">
          <Suspense fallback={<TabSkeleton />}>
            <TopicMapTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="wordcloud">
          <Suspense fallback={<TabSkeleton />}>
            <WordCloudTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="network">
          <Suspense fallback={<TabSkeleton />}>
            <CooccurrenceNetworkTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="lifecycle">
          <Suspense fallback={<TabSkeleton />}>
            <LifecycleTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabSkeleton() {
  return <Skeleton className="h-[680px] w-full" />;
}
