# TradeMind AI Project Health Check

Run this checklist before deployment and after important changes.

## Build Checks

- `npm run lint`
- `npm run build`

## Auth

- `/login` renders.
- `/register` renders.
- Logged-out users are redirected from protected routes to `/login`.
- Logged-in users can open `/dashboard`.
- Logout works.
- `/auth-debug` does not show secrets and is disabled in production.

## Manual Journal

- `/journal` renders.
- `/journal/new` creates a manual trade.
- Trade appears in `/journal`.
- Trade detail page opens.
- Delete trade works.

## AI Trade Review

- Trade detail page shows AI review section.
- Generate or Regenerate AI Review works.
- Review persists after refresh.
- `/ai-analysis` lists reviews.

## Economic Calendar

- `/calendar` renders.
- Events load from Supabase.
- Filters work.
- Trade detail news context renders.

## Strategies

- `/strategies` renders.
- Create strategy works.
- Detail page opens.
- Edit strategy works.
- Toggle active works.
- Delete strategy works.

## Backtest Lab

- `/backtest-lab` renders.
- Simulated backtest runs.
- Backtest result saves.
- Detail page opens.
- Delete backtest works.

## Market Scanner

- `/market-scanner` renders.
- Filters work.
- Market cards render.
- Symbol detail page opens.
- Scanner is clearly marked simulated.

## Signals

- `/signals` renders.
- Generate Simulated Signals works when at least one strategy is active.
- Signals save to Supabase.
- Filters work.
- Signal detail page opens.
- Dismiss works.
- Archive works.

## Connections

- `/connections` renders.
- `/connections/supabase` renders.
- `/connections/ai-provider` renders.
- `/connections/bybit` renders.
- Test Status works for Supabase.
- Test Status works for AI Service.
- Test Status works for Economic Calendar.

## Security

- `.env.local` is ignored by Git.
- `.env.example` contains placeholders only.
- No real secrets are committed.
- No service role key is imported into client components.
- No AI key is imported into client components.
- No real trading execution exists.
- Bybit, OKX, and MetaTrader remain future/read-only-first integrations.
