"use client";

import cytoscape, { type Core } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { CooccurrenceGraph } from "@/types/api";

cytoscape.use(coseBilkent);

export type CommunityNode = CooccurrenceGraph["nodes"][number] & {
  community?: number;
  label?: string;
};

export type CommunityEdge = CooccurrenceGraph["edges"][number];

export type CommunityGraph = {
  nodes: CommunityNode[];
  edges: CommunityEdge[];
};

export type CytoscapeGraphHandle = {
  reset: () => void;
  highlight: (keyword: string) => void;
};

type CytoscapeGraphProps = {
  graph?: CommunityGraph;
  layoutName: "cose-bilkent" | "concentric" | "breadthfirst";
  minWeight?: number;
  dark?: boolean;
  highlightKeyword?: string;
  resetKey?: number;
  onNodeClick?: (keyword: string) => void;
};

const fallbackGraph: CommunityGraph = {
  nodes: [
    { id: "광주", weight: 24, community: 0 },
    { id: "전남", weight: 21, community: 0 },
    { id: "AI", weight: 18, community: 1 },
    { id: "교육", weight: 16, community: 2 },
    { id: "교통", weight: 12, community: 3 },
  ],
  edges: [
    { source: "광주", target: "AI", weight: 8 },
    { source: "전남", target: "교육", weight: 9 },
    { source: "광주", target: "교통", weight: 5 },
    { source: "전남", target: "교통", weight: 4 },
  ],
};

const communityPalette = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#be185d",
  "#4f46e5",
  "#65a30d",
  "#0f766e",
];

export const CytoscapeGraph = forwardRef<CytoscapeGraphHandle, CytoscapeGraphProps>(
  (
    {
      graph,
      layoutName,
      minWeight = 1,
      dark = false,
      highlightKeyword = "",
      resetKey = 0,
      onNodeClick,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => cyRef.current?.fit(undefined, 32),
      highlight: (keyword: string) => applyHighlight(cyRef.current, keyword),
    }));

    useEffect(() => {
      applyHighlight(cyRef.current, highlightKeyword);
    }, [highlightKeyword]);

    useEffect(() => {
      cyRef.current?.fit(undefined, 32);
    }, [resetKey]);

    useEffect(() => {
      if (!containerRef.current) return;
      const source = graph && graph.nodes.length ? graph : fallbackGraph;
      const filteredEdges = source.edges.filter((edge) => edge.weight >= minWeight);
      const connectedIds = new Set(filteredEdges.flatMap((edge) => [edge.source, edge.target]));
      const nodes = source.nodes.filter((node) => connectedIds.has(node.id));
      const maxNode = Math.max(...nodes.map((node) => node.weight), 1);
      const maxEdge = Math.max(...filteredEdges.map((edge) => edge.weight), 1);

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((node) => ({
            data: {
              id: node.id,
              label: node.label ?? node.id,
              weight: node.weight,
              community: node.community ?? 0,
              size: 24 + Math.sqrt(node.weight / maxNode) * 46,
              color: communityPalette[(node.community ?? 0) % communityPalette.length],
            },
          })),
          ...filteredEdges.map((edge) => ({
            data: {
              id: `${edge.source}-${edge.target}`,
              source: edge.source,
              target: edge.target,
              weight: edge.weight,
              width: 1 + Math.sqrt(edge.weight / maxEdge) * 6,
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
              "border-width": 2,
              "border-color": dark ? "#0f172a" : "#ffffff",
              color: dark ? "#f8fafc" : "#111827",
              "font-size": "11px",
              "font-weight": "bold",
              "text-valign": "center",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": "72px",
              "text-outline-width": 3,
              "text-outline-color": dark ? "#020617" : "#ffffff",
            },
          },
          {
            selector: "edge",
            style: {
              width: "data(width)",
              "line-color": dark ? "#64748b" : "#94a3b8",
              "curve-style": "bezier",
              opacity: 0.38,
            },
          },
          { selector: ".faded", style: { opacity: 0.12 } },
          {
            selector: ".highlighted",
            style: { "border-width": 4, "border-color": "#f59e0b", opacity: 1 },
          },
        ],
        layout: {
          name: layoutName,
          animate: false,
          padding: 42,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: 110,
          nodeRepulsion: 8500,
        } as cytoscape.LayoutOptions,
      });

      cy.on("tap", "node", (event) => onNodeClick?.(event.target.id()));
      cyRef.current = cy;
      cy.fit(undefined, 32);
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }, [dark, graph, layoutName, minWeight, onNodeClick]);

    return <div ref={containerRef} className="h-[620px] w-full rounded-md border bg-card" />;
  },
);

function applyHighlight(cy: Core | null, keyword: string) {
  if (!cy) return;
  cy.elements().removeClass("highlighted faded");
  if (!keyword.trim()) return;
  const matched = cy.nodes().filter((node) => node.id().includes(keyword.trim()));
  cy.elements().addClass("faded");
  matched.removeClass("faded").addClass("highlighted");
  matched.neighborhood().removeClass("faded");
}

CytoscapeGraph.displayName = "CytoscapeGraph";
