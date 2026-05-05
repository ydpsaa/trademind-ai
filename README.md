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
8. `src/db/patches/008_product_data_model_upgrade.sql`
9. `src/db/patches/009_trading_accounts_readiness.sql`

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

Backtest Lab is real-data-ready. Historical market data is required before production backtests are presented as real performance. Old simulated foundation rows may remain in `backtests` as sandbox history, but production dashboard previews do not treat them as real results.

Stage 8 adds Market Scanner foundation. After Stage 0.0.2, production scanner output is disabled until Market Data Feed is connected:

- default watchlist: XAUUSD, EURUSD, GBPUSD, NAS100, US30, BTCUSDT, ETHUSDT
- filter structure remains available
- symbol detail pages under `/market-scanner/[symbol]` show a not-connected state
- dashboard market panel shows Market Data Feed readiness only

No external market data feed is connected yet. Fake scanner confidence, setup readiness, prices, and market states are not shown in production UI. Future stages will connect real market data and then use scanner context for Signals, Backtest Lab, and AI review context.

Stage 9 adds Signals foundation. For an existing database, apply:

```bash
src/db/patches/006_signals.sql
```

Signals are real-data-ready. Production signal generation is disabled until Market Data Feed and strategy validation are connected. Existing simulated foundation records remain stored with RLS as sandbox records and are hidden from the default production Signals view.

Stage 10 adds Connections foundation. For an existing database, apply:

```bash
src/db/patches/007_integration_connections.sql
```

The `integration_connections` table stores user-owned connection metadata only: provider, status, mode, safe metadata, and last checked time. It must not store raw API keys.

Stage 0.0.3 adds trading account readiness. Apply this patch in existing databases:

```bash
src/db/patches/009_trading_accounts_readiness.sql
```

The account selector is user-scoped. It shows All Accounts, a logical Manual Journal account, and future user-owned CSV, Bybit, OKX, or MetaTrader accounts after read-only/import stages are enabled. No fake balances or fake broker accounts are displayed.

Stage 10.1 separates user-facing trading connections from internal platform services:

- `/connections` shows only exchange, broker, charting, market data, and future automation integrations.
- Supabase is internal infrastructure, not a user trading connection.
- AI Service is platform-managed and uses local rules fallback when no server-side AI key is configured.
- Economic Calendar is an internal data service used for calendar views and news-risk context.
- `/system-status` is admin-only and shows internal service status for Supabase, AI Service, Economic Calendar, and simulated engines without exposing secrets.

Broker integrations are not live yet. Bybit and OKX are planned to start as read-only import connections before any execution features are considered. Never create exchange API keys with withdrawal permissions for TradeMind AI. Future API keys should be handled server-side or through a dedicated secrets workflow, not displayed in the UI.

Trading execution is disabled. Exchange integrations will start as read-only imports for trade history, account analytics, and portfolio reconciliation. The future execution layer requires a separate safety stage with paper trading, confirm-to-execute, kill switch, and risk limits before any broker or exchange order endpoint is connected.

Stage 12.0 adds the next product data model foundations for AI usage logs, psychology, discipline scoring, revenge event detection, pre-trade checklist rules, vector memory placeholders, plans, and usage tracking. See:

```bash
docs/product/product-data-model-upgrade.md
```

Stage 13 integrates AI usage logging and monthly usage counters for AI Trade Reviews. Local rules reviews cost `0`; real AI reviews can store provider/model, token usage when available, and rough estimated cost for future cost controls. Billing and hard limits are not enabled yet. See:

```bash
docs/product/ai-usage-cost-control.md
```

Stage 14 adds the Psychology Module foundation: emotion tracking on manual trades, a `/psychology` dashboard, Discipline Score preview, Revenge Index preview, and psychology context for AI Trade Review. See:

```bash
docs/product/psychology-module.md
```

Stage 15 adds saved Discipline Score snapshots and Revenge Index events. See:

```bash
docs/product/discipline-revenge-engine.md
```

Stage 16 adds the Pre-Trade Checklist foundation with manual and auto trading rules, rule checks on journal trades, rule adherence stats, and AI Review context. See:

```bash
docs/product/pre-trade-checklist.md
```

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
- Real-data-ready dashboard and product pages
- Supabase-backed manual journal
- Rules-based AI trade reviews
- Optional AI review generation with local fallback
- Supabase-backed economic calendar foundation with sample/manual events
- Supabase-backed Strategy Builder with reusable `rules_json` playbooks
- Supabase-backed Backtest Lab foundation, disabled for real performance until historical market data is connected
- Market Scanner foundation, disabled until Market Data Feed is connected
- Supabase-backed Signals foundation, disabled until Market Data Feed and strategy validation are connected
- Supabase-backed Connections foundation for safe integration status metadata

Not implemented yet:

- Real market data
- Real economic news API
- Real backtest engine with historical candles
- Real signal generation
- Trading execution
- Real exchange connections
