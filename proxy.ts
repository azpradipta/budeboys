import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every matched request (see `config.matcher` below).
 *
 * Two jobs:
 * 1. Refresh the Supabase session cookie so it doesn't silently expire
 *    mid-session (the standard @supabase/ssr pattern).
 * 2. Redirect unauthenticated visitors away from protected pages, before
 *    any page code runs.
 *
 * Note: this file is named `proxy.ts` (not `middleware.ts`) — Next.js 16
 * renamed the convention. See node_modules/next/dist/docs/.../proxy.md.
 *
 * API routes are NOT gated here — each one checks auth itself (see
 * app/api/*\/route.ts), per Next's own guidance not to rely on Proxy alone
 * for auth on Server Functions/routes.
 */

const PROTECTED_PREFIXES = ["/consultations", "/prescriptions", "/profile"];

export async function proxy(request: NextRequest) {
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
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization files —
    // API routes ARE included (for cookie refresh), but see the isProtected
    // check above: only page paths trigger a redirect.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
