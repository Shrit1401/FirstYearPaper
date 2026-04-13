import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";
import { coerceIsPaid, type AppUserProfile } from "@/lib/supabase/user-profile";

function getAccessToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  return header.slice("Bearer ".length).trim();
}

export async function requirePaidAccess(request: Request): Promise<{
  profile: Pick<AppUserProfile, "id" | "email" | "full_name" | "is_paid">;
}> {
  const accessToken = getAccessToken(request);
  const supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, full_name, is_paid")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || !coerceIsPaid(profile.is_paid)) {
    throw new Error("Repeat is locked for this account.");
  }

  return {
    profile: {
      ...profile,
      is_paid: coerceIsPaid(profile.is_paid),
    },
  };
}
