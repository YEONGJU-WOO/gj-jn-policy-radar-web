"use client";

import cytoscape from "cytoscape";
import { useEffect, useRef } from "react";

import type { CooccurrenceGraph } from "@/types/api";

type NetworkGraphProps = {
  graph?: CooccurrenceGraph;
  onNodeClick?: (keyword: string) => void;
};

const fallbackGraph: CooccurrenceGraph = {
  nodes: [
    { id: "광주", weight: 24 },
    { id: "전남", weight: 21 },
    { id: "AI", weight: 18 },
    { id: "해상풍력", weight: 16 },
    { id: "교통", weight: 12 },
  ],
  edges: [
    { source: "광주", target: "AI", weight: 8 },
    { source: "전남", target: "해상풍력", weight: 9 },
    { source: "광주", target: "교통", weight: 5 },
    { source: "전남", target: "교통", weight: 4 },
  ],
};

export function NetworkGraph({ graph, onNodeClick }: NetworkGraphProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const data = graph && graph.nodes.length ? graph : fallbackGraph;
    const maxNode = Math.max(...data.nodes.map((node) => node.weight), 1);
    const maxEdge = Math.max(...data.edges.map((edge) => edge.weight), 1);
    const palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...data.nodes.map((node, index) => ({
          data: {
            id: node.id,
            label: node.id,
            size: 24 + (node.weight / maxNode) * 34,
            color: palette[index % palette.length],
          },
        })),
        ...data.edges.map((edge) => ({
          data: {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            width: 1 + (edge.weight / maxEdge) * 6,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            width: "data(size)",
            height: "data(size)",
            "background-color": "data(color)",
            color: "#111827",
            "font-size": 12,
            "text-valign": "center",
            "text-halign": "center",
            "text-outline-width": 2,
            "text-outline-color": "#ffffff",
          },
        },
        {
          selector: "edge",
          style: {
            width: "data(width)",
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "curve-style": "bezier",
            opacity: 0.72,
          },
        },
      ],
      layout: { name: "cose", animate: false, padding: 24 },
    });

    cy.on("tap", "node", (event) => {
      onNodeClick?.(event.target.id());
    });

    return () => cy.destroy();
  }, [graph, onNodeClick]);

  return <div ref={ref} className="h-[520px] w-full rounded-md border bg-card" />;
}
