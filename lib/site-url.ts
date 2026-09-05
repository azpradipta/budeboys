/**
 * Canonical site origin used to build the Google/Supabase OAuth redirect
 * (`${getSiteUrl()}/auth/callback`). Prefer `NEXT_PUBLIC_SITE_URL` when set —
 * this matters whenever the browser's own origin isn't the one Supabase
 * should send the user back to (a tunnel like ngrok, a preview deployment
 * URL, a custom domain, etc.). Falls back to the browser's current origin
 * so it still works out of the box for local dev with nothing configured.
 *
 * Whatever this resolves to MUST also be added to Supabase → Authentication
 * → URL Configuration → Redirect URLs (e.g. `https://your-domain.com/**`),
 * otherwise Supabase rejects the redirectTo and falls back to its default
 * Site URL instead.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
