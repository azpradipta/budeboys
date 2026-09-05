import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client for Route Handlers / Server Components —
 * reads the user's session from cookies, so every query runs as that user
 * and Postgres RLS (docs/supabase-schema.sql) enforces per-user isolation. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // set — harmless as long as proxy.ts is also refreshing the
            // session (it is), which is the supported pattern for this.
          }
        },
      },
    }
  );
}
