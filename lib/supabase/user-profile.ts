import type { User } from "@supabase/supabase-js";

export type AppUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  year: string | null;
  semester: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
};

/** Normalize DB / API values so paid access is detected reliably. */
export function coerceIsPaid(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "t" || v === "1" || v === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

export function mapAppUserProfileRow(row: Record<string, unknown>): AppUserProfile {
  return {
    id: String(row.id),
    email: typeof row.email === "string" ? row.email : null,
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    year: typeof row.year === "string" ? row.year : null,
    semester: typeof row.semester === "string" ? row.semester : null,
    is_paid: coerceIsPaid(row.is_paid),
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

export function buildUserProfileSeed(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim() || null
        : null,
  };
}
