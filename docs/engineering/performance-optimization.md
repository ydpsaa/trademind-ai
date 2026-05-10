# Performance Optimization

Stage 17 focuses on perceived navigation speed without changing product behavior or the Black & White Liquid Glass direction.

## What Was Optimized

- Added route-level `loading.tsx` skeletons for major app routes.
- Added reusable `GlassSkeleton` and `PageLoadingShell` components.
- Reduced the default Liquid Glass blur and shadow cost.
- Added lighter `glass-subtle` and reserved `glass-heavy` for rare high-emphasis surfaces.
- Optimized Dashboard data loading to use one authenticated Supabase context instead of repeated auth/client setup.
- Limited Dashboard preview queries to compact row counts and explicit columns where practical.
- Limited Signals list fetches to a bounded result set.
- Excluded Next.js route prefetch requests from the auth proxy so sidebar/link hover prefetch does not run Supabase auth checks before navigation.
- Cached server Supabase client/user helpers per request with React `cache()`.
- Passed already-fetched authenticated users into `AppShell` on common data routes to avoid duplicate shell-level auth reads.
- Replaced broad `select("*")` reads with explicit columns on hot list/detail routes and common server actions.
- Added `content-visibility: auto` to glass cards so large offscreen sections are cheaper to render.
- Made sidebar navigation scroll safely on shorter desktop viewports and highlight nested routes without extra work.

## Query Rules

- Preview cards should fetch only the latest 3-5 records.
- Dashboard should not fetch full history unless the metric needs it.
- Use explicit columns for hot routes.
- Use `limit()` for preview/list pages where unbounded growth is possible.
- Fetch independent Supabase queries in parallel with `Promise.all`.
- Avoid repeated `getUser()` calls inside the same route when one user context can be reused.

## Liquid Glass Performance Rules

- Prefer `glass-panel` for primary cards and shells.
- Prefer `glass-subtle` for loading skeletons and nested surfaces.
- Avoid nesting multiple `backdrop-filter` layers inside each other.
- Keep blur radius moderate.
- Avoid large animated blur backgrounds.
- Use static gradients and subtle borders to preserve the premium look without heavy GPU work.

## Loading Skeletons

Use `PageLoadingShell` for route-level loading states and `GlassSkeleton` for local sections. Skeletons should be:

- monochrome
- softly pulsing
- structurally similar to the final page
- lightweight enough to render immediately

## Chart Guidance

Current charts are lightweight SVG components, not a heavy charting library. If future Recharts, TradingView widgets, or canvas-heavy visualizations are added:

- dynamically import client-only charts
- use `ssr: false` only for browser-only visualizations
- provide a `GlassSkeleton` fallback
- keep data passed to chart clients compact

## Sidebar Navigation

Sidebar stays lightweight:

- uses Next.js `Link`
- no data fetching inside the client sidebar
- user data is passed from the shared protected layout
- route links keep the default Next.js prefetch behavior
- normal internal navigation should never use `window.location`

## Persistent AppShell

Protected app routes live under a shared route-group layout. The layout renders `AppShell` once so the Sidebar and Topbar stay mounted while only the page content changes.

- `src/app/(app)/layout.tsx` owns the persistent shell and authenticated user context.
- Page-level `AppShell` calls are content wrappers only; they no longer render the Sidebar, Topbar, or background shell.
- Page `loading.tsx` files live under the protected route group, so loading skeletons replace only page content inside the persistent shell.
- Keep page-specific data fetching in pages, not in Sidebar or Topbar.
- Use `router.refresh()` only after mutations that need fresh server data, not for ordinary navigation.
