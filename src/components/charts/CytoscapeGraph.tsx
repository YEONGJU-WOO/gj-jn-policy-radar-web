"use client";

import cytoscape, { type Core } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { CooccurrenceGraph } from "@/types/api";

cytoscape.use(coseBilkent);

export type CytoscapeGraphHandle = {
  reset: () => void;
  highlight: (keyword: string) => void;
};

type CytoscapeGraphProps = {
  graph?: CooccurrenceGraph;
  layoutName: "cose-bilkent" | "concentric" | "breadthfirst";
  minWeight?: number;
  dark?: boolean;
  highlightKeyword?: string;
  resetKey?: number;
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
      reset: () => cyRef.current?.fit(undefined, 24),
      highlight: (keyword: string) => {
        const cy = cyRef.current;
        if (!cy) return;
        cy.elements().removeClass("highlighted faded");
        if (!keyword.trim()) return;
        const matched = cy.nodes().filter((node) => node.id().includes(keyword.trim()));
        cy.elements().addClass("faded");
        matched.removeClass("faded").addClass("highlighted");
        matched.neighborhood().removeClass("faded");
      },
    }));

    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass("highlighted faded");
      if (!highlightKeyword.trim()) return;
      const matched = cy.nodes().filter((node) => node.id().includes(highlightKeyword.trim()));
      cy.elements().addClass("faded");
      matched.removeClass("faded").addClass("highlighted");
      matched.neighborhood().removeClass("faded");
    }, [highlightKeyword]);

    useEffect(() => {
      cyRef.current?.fit(undefined, 24);
    }, [resetKey]);

    useEffect(() => {
      if (!containerRef.current) return;
      const source = graph && graph.nodes.length ? graph : fallbackGraph;
      const filteredEdges = source.edges.filter((edge) => edge.weight >= minWeight);
      const connectedIds = new Set(filteredEdges.flatMap((edge) => [edge.source, edge.target]));
      const nodes = source.nodes.filter((node) => connectedIds.has(node.id));
      const maxNode = Math.max(...nodes.map((node) => node.weight), 1);
      const maxEdge = Math.max(...filteredEdges.map((edge) => edge.weight), 1);
      const palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((node, index) => ({
            data: {
              id: node.id,
              label: node.id,
              weight: node.weight,
              size: 24 + (node.weight / maxNode) * 44,
              color: palette[index % palette.length],
            },
          })),
          ...filteredEdges.map((edge) => ({
            data: {
              id: `${edge.source}-${edge.target}`,
              source: edge.source,
              target: edge.target,
              weight: edge.weight,
              width: 1 + (edge.weight / maxEdge) * 7,
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
              color: dark ? "#f8fafc" : "#111827",
              "font-size": 12,
              "text-valign": "center",
              "text-halign": "center",
              "text-outline-width": 2,
              "text-outline-color": dark ? "#020617" : "#ffffff",
            },
          },
          {
            selector: "edge",
            style: {
              width: "data(width)",
              "line-color": dark ? "#64748b" : "#94a3b8",
              "curve-style": "bezier",
              opacity: 0.72,
            },
          },
          { selector: ".faded", style: { opacity: 0.16 } },
          { selector: ".highlighted", style: { "border-width": 3, "border-color": "#f59e0b" } },
        ],
        layout: { name: layoutName, animate: false, padding: 28 } as cytoscape.LayoutOptions,
      });

      cy.on("tap", "node", (event) => onNodeClick?.(event.target.id()));
      cyRef.current = cy;
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }, [dark, graph, layoutName, minWeight, onNodeClick]);

    return <div ref={containerRef} className="h-[560px] w-full rounded-md border bg-card" />;
  },
);

CytoscapeGraph.displayName = "CytoscapeGraph";
