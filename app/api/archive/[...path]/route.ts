import { readFile } from "node:fs/promises";
import path from "node:path";

type Asset = { url: string; sha256: string; size: number };
let assets: Promise<Record<string, Asset>> | undefined;
function readAssets() {
  return (assets ??= readFile(
    path.join(process.cwd(), "lib/convex-asset-map.json"),
    "utf8",
  ).then(JSON.parse));
}

// Public, immutable library files. Vercel's CDN absorbs repeated downloads so
// the Convex origin does not serve every page view. No cookies or paid gate.
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const segments = (await context.params).path;
  const asset = (await readAssets())["/" + segments.join("/")];
  if (!asset) return new Response("File not found", { status: 404 });
  const upstream = await fetch(asset.url, {
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
    redirect: "error",
  });
  if (!upstream.ok)
    return new Response("File temporarily unavailable", { status: 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=86400",
      "CDN-Cache-Control":
        "public, s-maxage=2592000, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=2592000, stale-while-revalidate=86400",
      ETag: `"${asset.sha256}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
