# TradeMind AI

Black and white Liquid Glass AI Trading OS for traders.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- lucide-react

## Install

```bash
npm install
```

## Environment

Create a local environment file:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Use the Supabase project URL and publishable/anon key for the public variables. Keep the service role key server-only and never expose it in browser code.

Optional AI review variables:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5-thinking
XAI_API_KEY=
XAI_MODEL=
MARKET_DATA_API_KEY=
```

If `OPENAI_API_KEY` is configured, TradeMind AI attempts to generate trade reviews with the configured AI service. If the key is missing, the model request fails, or the model returns invalid JSON, the app automatically falls back to the local rules-based review engine.

Regenerating an AI review can use paid AI API credits when a real AI key is configured. Use one deliberate click per review and rely on the local rules fallback for development when needed.

`XAI_API_KEY`, `XAI_MODEL`, and `MARKET_DATA_API_KEY` are placeholders for future stages. They are not required today.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```

## Database Setup

The MVP schema lives at:

```bash
src/db/schema.sql
```

To apply it manually:

1. Open your Supabase project.
2. Go to SQL Editor.
3. Paste the contents of `src/db/schema.sql`.
4. Run the SQL.

The schema creates profile, trading profile, account, trade, journal, AI review, strategy, backtest, and journal report tables with Row Level Security policies. It also creates an auth trigger that inserts a `profiles` row when a new user signs up.

For an existing Supabase database, apply SQL in this order:

1. `src/db/schema.sql`
2. `src/db/patches/001_ai_review_source.sql`
3. `src/db/patches/002_economic_events.sql`
4. `src/db/patches/003_strategy_builder.sql`
5. `src/db/patches/004_backtest_lab.sql`
6. `src/db/patches/006_signals.sql`
7. `src/db/patches/007_integration_connections.sql`

Stage 4.1 adds optional AI review metadata columns. For an existing database, apply this patch in Supabase SQL Editor:

```bash
src/db/patches/001_ai_review_source.sql
```

Stage 5 adds the economic calendar foundation. For an existing database, apply this patch in Supabase SQL Editor:

```bash
src/db/patches/002_economic_events.sql
```

The `economic_events` table is public reference data for authenticated users. Normal client users can read events, but no insert/update/delete policies are granted. The patch includes sample/demo events for testing only. A real economic news/calendar API is not connected yet.

Stage 6 uses the existing `strategies` table and stores reusable rule definitions in `strategies.rules_json`. If the table needs repair in an existing database, apply:

```bash
src/db/patches/003_strategy_builder.sql
```

Strategies are user-owned rows protected by RLS. They will later power Backtest Lab, Signals, and AI Review context.

Stage 7 adds Backtest Lab foundation. For an existing database, apply this optional repair/metadata patch:

```bash
src/db/patches/004_backtest_lab.sql
```

Backtest Lab currently uses a deterministic simulated engine stored in the `backtests` table. The result report is saved in `backtests.report_json` with equity curve points, simulated trades, warnings, strategy snapshot, and input settings. This is not real historical market performance; real market data integration will come later.

Stage 8 adds Market Scanner foundation. The scanner is local and simulated for now:

- default watchlist: XAUUSD, EURUSD, GBPUSD, NAS100, US30, BTCUSDT, ETHUSDT
- filterable SMC/ICT checklist output
- symbol detail pages under `/market-scanner/[symbol]`
- dashboard market panel powered by scanner-style mock results

No external market data feed is connected yet. The scanner output is not real-time market data and should not be treated as a trading signal. Future stages will connect real market data and then use scanner context for Signals, Backtest Lab, and AI review context.

Stage 9 adds Signals foundation. For an existing database, apply:

```bash
src/db/patches/006_signals.sql
```

Signals are simulated setup ideas generated from local scanner output and the current user's active strategies. They are stored in the `signals` table with RLS. No live market data, broker routing, or order execution is connected.

Stage 10 adds Connections foundation. For an existing database, apply:

```bash
src/db/patches/007_integration_connections.sql
```

The `integration_connections` table stores user-owned connection metadata only: provider, status, mode, safe metadata, and last checked time. It must not store raw API keys.

Stage 10.1 separates user-facing trading connections from internal platform services:

- `/connections` shows only exchange, broker, charting, market data, and future automation integrations.
- Supabase is internal infrastructure, not a user trading connection.
- AI Service is platform-managed and uses local rules fallback when no server-side AI key is configured.
- Economic Calendar is an internal data service used for calendar views and news-risk context.
- `/system-status` shows internal service status for Supabase, AI Service, Economic Calendar, and simulated engines without exposing secrets.

Broker integrations are not live yet. Bybit and OKX are planned to start as read-only import connections before any execution features are considered. Never create exchange API keys with withdrawal permissions for TradeMind AI. Future API keys should be handled server-side or through a dedicated secrets workflow, not displayed in the UI.

Trading execution is disabled. Exchange integrations will start as read-only imports for trade history, account analytics, and portfolio reconciliation. The future execution layer requires a separate safety stage with paper trading, confirm-to-execute, kill switch, and risk limits before any broker or exchange order endpoint is connected.

## Production Deployment

Deployment docs:

- `docs/deployment/vercel-checklist.md`
- `docs/deployment/supabase-auth-urls.md`
- `docs/project-health-check.md`

Before deploying:

```bash
npm run lint
npm run build
```

Production environment variables must be configured in Vercel Project Settings. Do not commit `.env.local`.

After the first Vercel deployment, update Supabase Auth URL Configuration with the production URL and localhost development URLs. The current planned Vercel URL is:

```text
https://trademind-ai-mu.vercel.app
```

Security notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- `OPENAI_API_KEY` is server-only.
- `NEXT_PUBLIC_` variables are visible in the browser and must not contain secrets.
- `/auth-debug` is disabled in production.
- Basic security headers are configured in `next.config.ts`.
- No real trading execution, broker routing, or exchange order placement exists in this MVP.

## Current Scope

Implemented:

- Liquid Glass app shell
- Protected application routes
- Email/password login and registration
- Supabase client helpers
- Supabase database foundation schema
- Mock dashboard and product pages
- Supabase-backed manual journal
- Rules-based AI trade reviews
- Optional AI review generation with local fallback
- Supabase-backed economic calendar foundation with sample/manual events
- Supabase-backed Strategy Builder with reusable `rules_json` playbooks
- Supabase-backed Backtest Lab foundation with simulated reports
- Simulated Market Scanner foundation with SMC/ICT checklist output
- Supabase-backed simulated Signals foundation
- Supabase-backed Connections foundation for safe integration status metadata

Not implemented yet:

- Real market data
- Real economic news API
- Real backtest engine with historical candles
- Real signal generation
- Trading execution
- Real exchange connections
