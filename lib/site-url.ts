/**
 * Origin resmi aplikasi untuk menyusun redirect OAuth
 * (`${getSiteUrl()}/auth/callback`). NEXT_PUBLIC_SITE_URL dipakai bila diisi,
 * penting saat origin browser bukan tujuan balik yang benar, misalnya tunnel
 * ngrok, preview deployment, atau domain kustom. Kalau kosong, jatuh ke
 * origin browser agar dev lokal tetap jalan.
 *
 * Nilai akhirnya wajib terdaftar di Supabase, Authentication, URL
 * Configuration, Redirect URLs (contoh `https://domain-anda.com/**`). Kalau
 * tidak, Supabase menolak redirectTo dan memakai Site URL bawaannya.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
