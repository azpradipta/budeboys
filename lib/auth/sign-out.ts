"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Sign the user out and make sure the session cookie is actually gone.
 *
 * Two things Supabase's own `signOut()` does that don't suit us:
 *
 * 1. It defaults to `scope: "global"`, which revokes the refresh token for
 *    *every* session this user has. Any other tab or device still holding the
 *    cookie is left with a token that can never be refreshed again. Logging
 *    out here should only end the session here, so we ask for `"local"`.
 *
 * 2. It loads the session before deleting it, and loading can trigger a
 *    refresh. When that refresh fails ("Refresh token is not valid") it
 *    returns the error *before* clearing storage — leaving the dead session
 *    cookie behind, which then blocks every protected page. So we check the
 *    error and clear the cookies ourselves when it happens.
 */
export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) clearSupabaseAuthCookies();
}

/** Last-resort cleanup for when `signOut()` bailed out before doing it.
 * Every key Supabase derives from its storage key — the chunked session
 * (`.0`, `.1`, …) and the PKCE verifiers — is prefixed with it, so matching
 * on `sb-…-auth-token` covers all of them. */
function clearSupabaseAuthCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name?.startsWith("sb-") || !name.includes("-auth-token")) continue;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
