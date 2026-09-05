"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client — used for signInWithOAuth, signOut, and
 * reactive auth state (lib/auth/use-user.ts). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
