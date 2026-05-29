"use client";

import dynamic from "next/dynamic";

const ReactWordcloud = dynamic(() => import("react-wordcloud"), { ssr: false });

export function WordCloudPanel({
  words,
  onWordClick,
}: {
  words: Array<{ text: string; value: number }>;
  onWordClick?: (word: string) => void;
}) {
  return (
    <div className="h-[420px] rounded-md border bg-card p-3">
      <ReactWordcloud
        words={words}
        callbacks={{
          onWordClick: (word) => onWordClick?.(word.text),
        }}
        options={{
          fontFamily: "Pretendard, NanumGothic, system-ui, sans-serif",
          rotations: 1,
          rotationAngles: [0, 0],
          colors: ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"],
        }}
      />
    </div>
  );
}
