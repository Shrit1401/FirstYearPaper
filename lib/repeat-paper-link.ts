import type { RepeatV2Catalog } from "./repeat-v2-types";
function normalizedSource(value: string) {
  try {
    return decodeURIComponent(value.split(/[?#]/)[0]);
  } catch {
    return value;
  }
}
export function findLinkedRepeatPaper(
  catalog: RepeatV2Catalog,
  paperId = "",
  source = "",
) {
  if (paperId) return catalog.papers.find((p) => p.id === paperId);
  if (!source) return undefined;
  const wanted = normalizedSource(source);
  return catalog.papers.find((p) =>
    [p.href, ...p.sourceFiles.map((file) => file.href)].some(
      (href) => normalizedSource(href) === wanted,
    ),
  );
}
