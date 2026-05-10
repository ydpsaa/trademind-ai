import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clearSupabaseAuthCookies, isInvalidRefreshTokenError } from "@/lib/auth/session-guard";

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

  const redirectToLogin = (clearAuthCookies = false) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    if (clearAuthCookies) {
      clearSupabaseAuthCookies(request, redirectResponse);
    }
    return redirectResponse;
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
        try {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        } catch {
          // Let the next request retry session synchronization.
        }
      },
    },
  });

  let data = null;
  let error = null;

  try {
    const result = await supabase.auth.getUser();
    data = result.data;
    error = result.error;
  } catch (authError) {
    if (isInvalidRefreshTokenError(authError)) {
      return redirectToLogin(true);
    }
    return redirectToLogin();
  }

  if (error && isInvalidRefreshTokenError(error)) {
    return redirectToLogin(true);
  }

  if (!data?.user) {
    return redirectToLogin();
  }

  return response;
}
