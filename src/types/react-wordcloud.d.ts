declare module "react-wordcloud" {
  import type { ComponentType } from "react";

  type Word = { text: string; value: number };
  type Props = {
    words: Word[];
    options?: Record<string, unknown>;
    callbacks?: {
      onWordClick?: (word: Word) => void;
    };
  };

  const ReactWordcloud: ComponentType<Props>;
  export default ReactWordcloud;
}
