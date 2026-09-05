// Origin untuk menyusun redirect OAuth, jatuh ke origin browser bila env kosong.
// Nilainya harus terdaftar di Supabase Authentication, URL Configuration.
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
