export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

export function getSupabasePublishableKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return value;
}

/** Where Repeat loads chunks from: local `generated/repeat-index/index.json` or Supabase (`repeat_*` tables). */
export function getRepeatIndexSource(): "local" | "supabase" {
  const raw = (process.env.REPEAT_INDEX_SOURCE ?? "local").toLowerCase();
  return raw === "supabase" ? "supabase" : "local";
}

/**
 * Public base URL for PDFs in Supabase Storage, without trailing slash.
 * Example: https://xxxx.supabase.co/storage/v1/object/public/papers
 */
export function getPaperStoragePublicBaseUrl() {
  return process.env.NEXT_PUBLIC_PAPER_STORAGE_BASE_URL?.replace(/\/$/, "") ?? "";
}
