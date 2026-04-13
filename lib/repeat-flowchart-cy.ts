import type cytoscape from "cytoscape";
import type { ParsedEdge } from "@/lib/repeat-diagram-parse";

function nodeDisplayLabel(id: string, raw: string): string {
  const t = raw.trim() || id;
  return t;
}

/** Cytoscape elements from parsed Mermaid-style edges (same input as before). */
export function buildCytoscapeElements(edges: ParsedEdge[]) {
  const labels = new Map<string, string>();
  for (const e of edges) {
    if (!labels.has(e.from)) labels.set(e.from, e.fromLabel);
    if (!labels.has(e.to)) labels.set(e.to, e.toLabel);
  }

  const nodes = [...labels.entries()].map(([id, label]) => ({
    data: { id, label: nodeDisplayLabel(id, label) },
  }));

  const cyEdges = edges.map((e, i) => ({
    data: {
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      label: e.edgeLabel?.trim() ?? "",
    },
  }));

  return [...nodes, ...cyEdges];
}

/**
 * Dark, high-contrast flowchart styling inspired by Flowchart Fun
 * (https://flowchart.fun/ — also built on Cytoscape.js).
 */
export const flowchartFunLikeStylesheet: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      shape: "round-rectangle",
      "background-color": "#34343a",
      "background-opacity": 1,
      label: "data(label)",
      color: "#f4f4f5",
      "font-size": "13px",
      "font-weight": 600,
      "font-family": "ui-sans-serif, system-ui, sans-serif",
      "text-wrap": "wrap",
      "text-max-width": "168px",
      "text-halign": "center",
      "text-valign": "center",
      padding: "14px",
      width: "label",
      height: "label",
      "border-width": 1,
      "border-color": "rgba(255,255,255,0.22)",
      "min-width": "72px",
      "min-height": "36px",
    },
  },
  {
    selector: "edge",
    style: {
      width: 2.25,
      "line-color": "#9ca3af",
      "target-arrow-color": "#9ca3af",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.85,
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": "11px",
      "font-weight": 500,
      color: "#d4d4d8",
      "text-margin-y": -8,
      "text-background-color": "#18181b",
      "text-background-opacity": 0.95,
      "text-background-padding": "5px",
      "text-border-color": "rgba(255,255,255,0.14)",
      "text-border-width": 1,
      "text-border-opacity": 1,
    },
  },
];
