import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Berjalan sebelum setiap request yang cocok dengan matcher, dengan tiga
 * tugas: me-refresh cookie sesi Supabase, menahan pengunjung yang belum
 * login dari halaman terproteksi, dan melempar pengguna yang sudah login
 * dari landing page ke aplikasi.
 *
 * Next.js 16 mengganti nama konvensi ini dari `middleware.ts` ke `proxy.ts`.
 *
 * Route API sengaja tidak dijaga di sini; masing-masing memeriksa auth
 * sendiri, sesuai anjuran Next agar tidak bergantung pada proxy saja.
 */

const PROTECTED_PREFIXES = ["/consultations", "/prescriptions", "/profile"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Tanpa konfigurasi Supabase, biarkan semua lewat daripada mematikan
  // seluruh aplikasi. Proteksi aktif sendiri begitu env terisi.
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
    // Semua kecuali aset statis. Route API ikut agar cookie sesinya tetap
    // segar; hanya path halaman yang bisa memicu redirect.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
