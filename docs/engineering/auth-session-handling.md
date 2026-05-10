# Auth Session Handling

TradeMind AI uses Supabase Auth with the Next.js App Router and `@supabase/ssr`.

## Session Refresh

- Protected routes are checked in `src/proxy.ts` through `src/lib/supabase/middleware.ts`.
- Middleware creates a Supabase server client from request cookies.
- Supabase may refresh auth cookies during `auth.getUser()`.
- If the user is not authenticated, protected routes redirect to `/login?next=<path>`.

## Invalid Refresh Tokens

Local browsers can retain stale Supabase cookies after logout, project changes, or manual cookie edits. Supabase can then return:

- `Invalid Refresh Token`
- `Refresh Token Not Found`
- `AuthSessionMissingError`

These are handled as signed-out states, not application crashes.

The guard lives in:

- `src/lib/auth/session-guard.ts`

When middleware detects an invalid refresh token, it clears matching Supabase auth cookies and redirects to `/login`.

## Server Components

Server components use `getCurrentUser()` from `src/lib/supabase/server.ts`.

If auth cookies are stale, `getCurrentUser()` returns `null` instead of throwing. The protected app layout then redirects to `/login`.

## Login And Register

The login/register form:

- validates `next` as an internal path only
- creates a Supabase browser session
- replaces the current route with the target app route
- refreshes server components after navigation

## Logout

Sidebar logout:

- calls `supabase.auth.signOut()`
- treats invalid refresh-token errors as already signed out
- redirects to `/login`
- refreshes server components

## Troubleshooting

If a local browser still has stale development cookies, clear site data for `localhost:3000` and sign in again.

Production users should see a clean redirect to login rather than raw Supabase auth errors.
