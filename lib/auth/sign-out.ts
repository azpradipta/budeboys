"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Mengeluarkan pengguna dari sesi di browser ini saja (`scope: "local"`).
 * signOut bisa berhenti dengan error sebelum sempat menghapus cookie, jadi
 * cookienya dibersihkan sendiri saat itu terjadi. */
export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) clearSupabaseAuthCookies();
}

/** Semua kunci turunan Supabase berawalan storage key-nya, jadi pola
 * `sb-…-auth-token` sudah mencakup pecahan sesi dan verifier PKCE. */
function clearSupabaseAuthCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name?.startsWith("sb-") || !name.includes("-auth-token")) continue;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
