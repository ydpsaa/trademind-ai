import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = [
  "/dashboard",
  "/journal",
  "/ai-analysis",
  "/market-scanner",
  "/backtest-lab",
  "/strategies",
  "/signals",
  "/psychology",
  "/rules",
  "/calendar",
  "/connections",
  "/system-status",
  "/settings",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isProtectedRoute(pathname)) {
    return response;
  }

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectToLogin();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return redirectToLogin();
  }

  return response;
}
