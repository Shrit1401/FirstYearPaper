import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { RepeatV2Catalog, RepeatV2Paper, RepeatV2Question } from "./repeat-v2-types";

const safeId = /^[a-zA-Z0-9_-]{1,128}$/;
const assetPrefix = "/repeat-v2/assets/";
const safeAsset = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/i;

export class RepeatV2Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "RepeatV2Error";
  }
}

let catalogCache: { mtimeMs: number; data: RepeatV2Catalog } | undefined;

export async function readRepeatV2Catalog(): Promise<RepeatV2Catalog> {
  const filename = path.join(process.cwd(), "public/repeat-v2/index.json");
  try {
    const info = await stat(filename);
    if (catalogCache?.mtimeMs === info.mtimeMs) return catalogCache.data;
    const data = JSON.parse(await readFile(filename, "utf8")) as RepeatV2Catalog;
    if (data.version !== 2 || !Array.isArray(data.papers) || !data.stats) {
      throw new Error("Invalid catalog schema");
    }
    catalogCache = { mtimeMs: info.mtimeMs, data };
    return data;
  } catch {
    throw new RepeatV2Error(
      "The question library is still being prepared. Please try again shortly.",
      "library_unavailable",
      503,
    );
  }
}

export async function readRepeatV2Paper(id: string): Promise<RepeatV2Paper> {
  if (!safeId.test(id)) {
    throw new RepeatV2Error("Paper not found.", "paper_not_found", 404);
  }
  const catalog = await readRepeatV2Catalog();
  if (!catalog.papers.some((paper) => paper.id === id)) {
    throw new RepeatV2Error("Paper not found.", "paper_not_found", 404);
  }
  try {
    const paper = JSON.parse(
      await readFile(path.join(process.cwd(), `public/repeat-v2/papers/${id}.json`), "utf8"),
    ) as RepeatV2Paper;
    if (paper.id !== id || !Array.isArray(paper.questions) || !Array.isArray(paper.pages)) {
      throw new Error("Invalid paper schema");
    }
    return paper;
  } catch {
    throw new RepeatV2Error(
      "This paper is still being transcribed. Please try again shortly.",
      "paper_unavailable",
      503,
    );
  }
}

export type RepeatV2AttachedImage = { pageNumber: number; imageUrl: string; kind: string };

async function readSourceAsset(src: string, remainingBytes: number) {
  // The app serves Convex scans through its public, CDN-cached archive route.
  // Keep scans out of serverless bundles and trust only the configured origin.
  const assetBase = process.env.REPEAT_ASSET_BASE_URL?.trim()
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (assetBase) {
    const response = await fetch(new URL(src, assetBase), {
      signal: AbortSignal.timeout(20_000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith("image/")) {
      await response.body?.cancel();
      throw new Error("Source image unavailable");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > remainingBytes) {
          throw new RepeatV2Error("The source scans are too large for one solution. Please choose a smaller question.", "source_too_large", 422);
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks);
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
  // The local scan archive is runtime storage, deliberately excluded from
  // serverless bundles. Self-hosted Node keeps a conventional project-relative
  // default, while deployments can explicitly locate the archive elsewhere.
  // Match Next's own runtime-file handling: annotate each bare path argument
  // so Turbopack does not expand a runtime storage path into a project-wide
  // build dependency. These annotations do not bypass the realpath/size checks.
  // Catalog and paper JSON reads above remain traced and explicitly included.
  const configuredRoot = process.env.REPEAT_LOCAL_ASSET_ROOT?.trim() || "public/repeat-v2/assets";
  const assetRoot = path.resolve(/* turbopackIgnore: true */ configuredRoot);
  const filename = path.join(/* turbopackIgnore: true */ assetRoot, src.slice(assetPrefix.length));
  const resolved = await realpath(/* turbopackIgnore: true */ filename);
  const resolvedRoot = await realpath(/* turbopackIgnore: true */ assetRoot);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Invalid asset path");
  const info = await stat(/* turbopackIgnore: true */ resolved);
  if (!info.isFile() || info.size > remainingBytes) {
    throw new RepeatV2Error("The source scans are too large for one solution. Please choose a smaller question.", "source_too_large", 422);
  }
  return readFile(/* turbopackIgnore: true */ resolved);
}

/** Only server-owned library assets can enter the model request. */
export async function readRepeatV2QuestionImages(
  paper: RepeatV2Paper,
  question: RepeatV2Question,
): Promise<RepeatV2AttachedImage[]> {
  const references = question.sourceImages.map((image) => ({ ...image, kind: "Original question scan" }));
  for (const pageNumber of question.pageNumbers) {
    if (references.some((image) => image.pageNumber === pageNumber)) continue;
    const page = paper.pages.find((entry) => entry.number === pageNumber);
    if (page?.image) references.push({ src: page.image, pageNumber, kind: "Original paper page" });
  }
  references.push(...question.diagrams.map((image) => ({ ...image, kind: image.caption || "Original diagram" })));
  const unique = references.filter((image, index) => references.findIndex((entry) => entry.src === image.src) === index);
  if (unique.length === 0) {
    throw new RepeatV2Error("The original question scan is unavailable. Please try again after the paper finishes processing.", "source_unavailable", 503);
  }
  if (unique.length > 12) {
    throw new RepeatV2Error("This question has too many source images to solve in one request.", "source_too_large", 422);
  }
  let totalBytes = 0;
  const images: RepeatV2AttachedImage[] = [];
  for (const reference of unique) {
    if (!reference.src.startsWith(assetPrefix) || !safeAsset.test(reference.src.slice(assetPrefix.length))) {
      throw new RepeatV2Error("The original question scan is unavailable.", "source_unavailable", 503);
    }
    const extension = path.extname(reference.src).toLowerCase();
    const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[extension];
    if (!mime) {
      throw new RepeatV2Error("The original question scan is unavailable.", "source_unavailable", 503);
    }
    try {
      const data = await readSourceAsset(reference.src, 20 * 1024 * 1024 - totalBytes);
      totalBytes += data.byteLength;
      images.push({ pageNumber: reference.pageNumber, kind: reference.kind, imageUrl: `data:${mime};base64,${data.toString("base64")}` });
    } catch (error) {
      if (error instanceof RepeatV2Error) throw error;
      throw new RepeatV2Error("A source scan could not be loaded. Please try again shortly.", "source_unavailable", 503);
    }
  }
  return images;
}
