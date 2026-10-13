import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Läuft vor jeder Seite: frischt die Supabase-Sitzung auf und schickt Abgemeldete zum Login.
// Die eigentliche Absicherung der Daten macht Row Level Security in der Datenbank.

const PUBLIC_PATHS = ["/login", "/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Lokal ohne .env.local: Seiten trotzdem anzeigen (ohne Daten). In Produktion ein harter Fehler.
    if (process.env.NODE_ENV === "development") return response;
    throw new Error("Supabase-Umgebungsvariablen fehlen");
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    }
  );

  // Früh aufrufen, damit eine aufgefrischte Sitzung noch in die Antwort geschrieben wird.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Alles außer statischen Dateien und Bildern
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|woff2?)$).*)",
  ],
};
