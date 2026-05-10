import type { NextRequest, NextResponse } from "next/server";

const invalidSessionPatterns = [
  "invalid refresh token",
  "refresh token not found",
  "authsessionmissingerror",
  "auth session missing",
  "session missing",
];

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const normalized = message.toLowerCase();
  return invalidSessionPatterns.some((pattern) => normalized.includes(pattern));
}

export function isSupabaseAuthCookie(name: string) {
  return /^sb-.+-auth-token(?:\.\d+)?$/.test(name);
}

export function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (!isSupabaseAuthCookie(cookie.name)) return;
    request.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
    });
  });
}
