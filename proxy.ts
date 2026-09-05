import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every matched request (see `config.matcher` below).
 *
 * Three jobs:
 * 1. Refresh the Supabase session cookie so it doesn't silently expire
 *    mid-session (the standard @supabase/ssr pattern).
 * 2. Redirect unauthenticated visitors away from protected pages, before
 *    any page code runs.
 * 3. Redirect authenticated visitors away from "/" (the marketing landing
 *    page) straight into the app — home is only ever meant for signed-out
 *    visitors.
 *
 * Note: this file is named `proxy.ts` (not `middleware.ts`) — Next.js 16
 * renamed the convention. See node_modules/next/dist/docs/.../proxy.md.
 *
 * API routes are NOT gated here — each one checks auth itself (see
 * app/api/*\/route.ts), per Next's own guidance not to rely on Proxy alone
 * for auth on Server Functions/routes.
 */

/** Kept in sync by hand with `config.matcher` below — the matcher decides
 * which requests reach this file at all, this list decides which of those get
 * redirected. Matcher patterns must be static literals, so they can't be
 * derived from this array. */
const PROTECTED_PREFIXES = ["/consultations", "/prescriptions", "/profile"];

/**
 * The OAuth callback must never go through the Supabase client here.
 *
 * `config.matcher` already keeps it out, but this guard stays as a tripwire:
 * widening the matcher again would silently reintroduce a login-breaking bug.
 *
 * `getUser()` on a dead session makes auth-js call `_removeSession()`, which
 * clears the session *and every PKCE code verifier*. Those removals run
 * through `setAll` below, which rewrites `request.cookies` — so the callback
 * route handler would then read an empty `sb-…-auth-token-code-verifier` and
 * `exchangeCodeForSession()` would fail. That is what made every login after
 * a logout bounce to `/?auth_error=1`.
 */
const AUTH_CALLBACK_PATH = "/auth/callback";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === AUTH_CALLBACK_PATH) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // Supabase not configured yet (see .env.example) — let everything through
  // rather than breaking the whole app on every request while that's being
  // set up. Once the env vars are set, protection is live automatically.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("login", "1");
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    // `NextResponse.redirect()` is a brand new response, so anything the
    // Supabase client wrote onto `response` — a refreshed session, or the
    // removal of one whose refresh token is no longer valid — would be
    // dropped. That left dead cookies in the browser that could never be
    // cleaned up on a protected path, so every visit failed the same way:
    // a permanent redirect loop. Carry those Set-Cookie headers over.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (request.nextUrl.pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/consultations";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Only the pages this file actually gates. `getUser()` is a network call
    // to Supabase, so matching everything meant one round-trip per request —
    // including every RSC prefetch, API call and file in public/.
    //
    // Nothing else needs the Proxy to refresh the session cookie: API routes
    // build their own server client and refresh as a side effect of their own
    // `getUser()`, and in the browser the Supabase client auto-refreshes.
    "/consultations/:path*",
    "/prescriptions/:path*",
    "/profile/:path*",
  ],
};
