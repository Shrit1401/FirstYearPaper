import { getPaperStoragePublicBaseUrl } from "@/lib/supabase/config";

/** PDF paths from the manifest look like `/Stream Name/file.pdf`. */
function isManifestPdfPath(href: string) {
  return href.startsWith("/") && /\.pdf($|\?)/i.test(href);
}

/**
 * When `NEXT_PUBLIC_PAPER_STORAGE_BASE_URL` is set, rewrite manifest-relative PDF paths
 * to the Supabase Storage public URL (bucket object key = path without leading slash).
 */
export function resolvePublicPaperHref(href: string): string {
  const base = getPaperStoragePublicBaseUrl();
  if (!base || !isManifestPdfPath(href)) return href;

  const path = href.startsWith("/") ? href.slice(1) : href;
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encoded}`;
}
