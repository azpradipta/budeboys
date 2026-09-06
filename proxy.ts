import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Me-refresh cookie sesi dan menjaga akses halaman sesuai status login.
// Route API tidak dijaga di sini karena masing-masing memeriksa auth sendiri.

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

  // Tanpa konfigurasi Supabase semua request dilewatkan; proteksi aktif saat env terisi.
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
    // Semua kecuali aset statis. Route API ikut agar cookie sesinya tetap segar.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
