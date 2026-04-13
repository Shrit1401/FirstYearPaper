/** Parse AI-generated flowchart text (Mermaid-style) into edges for Cytoscape / list fallbacks. */

export type ParsedEdge = {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  edgeLabel?: string;
};

export function escapeDiagramLabel(label: string) {
  return label
    .replace(/"/g, "'")
    .replace(/\[(C\d+(?:,\s*C\d+)*)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|mindmap|timeline)\b/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/^([A-Za-z0-9_]+)\s+--\s+(.+?)\s+-->\s+([A-Za-z0-9_].*)$/g, "$1 -->|$2| $3")
    .replace(/\{([^{}]+)\}/g, (_, label: string) => `["${escapeDiagramLabel(label)}"]`)
    .replace(/\[([^\[\]]+)\]/g, (_, label: string) => `["${escapeDiagramLabel(label)}"]`)
    .replace(/\(([^()]+)\)/g, (_, label: string) => `("${escapeDiagramLabel(label)}")`)
    .replace(/\|\s*\[([^\]]+)\]\s*\|/g, (_, label: string) => `|${escapeDiagramLabel(label)}|`)
    .replace(/\s{2,}/g, " ");
}

export function normalizeFlowchartSource(chart: string) {
  const normalized = chart.replace(/\r\n/g, "\n").trim();
  const withHeader = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|mindmap|timeline)\b/m.test(
    normalized
  )
    ? normalized
    : `flowchart TD\n${normalized}`;

  return withHeader
    .split("\n")
    .map((line) => sanitizeLine(line))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function createFallbackSummary(chart: string) {
  return chart
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^(graph|flowchart)\b/i.test(line))
    .slice(0, 6)
    .map((line) => line.replace(/^[A-Za-z0-9_]+\s*-->\s*/, "").replace(/["[\]{}()]/g, "").trim());
}

export function parseFlowEdges(chart: string): ParsedEdge[] {
  const parsed = chart
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|mindmap|timeline|subgraph|end)\b/i.test(
          line
        )
    )
    .map((line): ParsedEdge | null => {
      const match = line.match(
        /^([A-Za-z0-9_]+)(?:\["([^"]+)"\]|\("([^"]+)"\)|\{"([^}]+)"\})?\s*-->(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)(?:\["([^"]+)"\]|\("([^"]+)"\)|\{"([^}]+)"\})?/
      );

      if (!match) return null;

      const from = match[1];
      const to = match[6];
      const fromLabel = match[2] || match[3] || match[4] || from;
      const edgeLabel = match[5]?.trim() || undefined;
      const toLabel = match[7] || match[8] || match[9] || to;

      return {
        from,
        to,
        fromLabel: escapeDiagramLabel(fromLabel),
        toLabel: escapeDiagramLabel(toLabel),
        edgeLabel: edgeLabel ? escapeDiagramLabel(edgeLabel) : undefined,
      };
    })
    .filter((edge): edge is ParsedEdge => edge !== null);

  return parsed;
}

export type GraphStep = { id: string; label: string; edgeLabel?: string };

export function buildGraphSteps(edges: ParsedEdge[]): GraphStep[] {
  const ordered: GraphStep[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    if (!seen.has(edge.from)) {
      ordered.push({ id: edge.from, label: edge.fromLabel });
      seen.add(edge.from);
    }

    if (!seen.has(edge.to)) {
      ordered.push({ id: edge.to, label: edge.toLabel, edgeLabel: edge.edgeLabel });
      seen.add(edge.to);
    }
  }

  return ordered;
}
