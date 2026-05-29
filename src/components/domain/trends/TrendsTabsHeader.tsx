"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TrendsTabsHeader() {
  return (
    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5">
      <TabsTrigger value="keywords">키워드 추이</TabsTrigger>
      <TabsTrigger value="topic-map">토픽맵</TabsTrigger>
      <TabsTrigger value="wordcloud">워드클라우드</TabsTrigger>
      <TabsTrigger value="network">네트워크</TabsTrigger>
      <TabsTrigger value="lifecycle">라이프사이클</TabsTrigger>
    </TabsList>
  );
}
