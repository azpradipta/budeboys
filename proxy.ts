import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Me-refresh cookie sesi dan menjaga akses halaman sesuai status login.
// Route API tidak dijaga di sini karena masing-masing memeriksa auth sendiri.

/** Disinkronkan manual dengan `config.matcher` di bawah, sebab pola matcher
 * harus literal statis dan tidak bisa diturunkan dari array ini. */
const PROTECTED_PREFIXES = ["/consultations", "/prescriptions", "/profile"];

/** Callback OAuth tidak boleh lewat client Supabase di sini: `getUser()` pada
 * sesi mati memicu penghapusan PKCE code verifier dari request, sehingga
 * `exchangeCodeForSession()` di route handler gagal. */
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
    // Response redirect dibuat baru, jadi cookie yang ditulis client Supabase
    // ikut dibawa. Tanpa ini cookie sesi mati tidak pernah bisa dibersihkan.
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
