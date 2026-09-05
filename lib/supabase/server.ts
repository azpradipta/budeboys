import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client untuk route handler dan server component. Sesi dibaca
 * dari cookie sehingga tiap query berjalan sebagai user tersebut dan RLS
 * Postgres yang menjaga isolasi (docs/supabase-schema.sql). */
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
            // Server component tidak bisa menulis cookie. Aman, karena
            // proxy.ts yang me-refresh sesinya.
          }
        },
      },
    }
  );
}
