# Product Data Model Upgrade

Stage 12.0 adds database and TypeScript foundations for the next TradeMind AI product phase. It does not connect external APIs, brokers, OCR, Stripe, or execution.

## SQL Patch

Apply this patch manually in Supabase SQL Editor:

```text
src/db/patches/008_product_data_model_upgrade.sql
```

The patch is additive and uses safe `create table if not exists`, `add column if not exists`, indexes, seed inserts with `on conflict do nothing`, and Row Level Security.

## Added Foundations

- `ai_usage_logs`: tracks AI feature usage, provider/model metadata, token estimates, costs, status, and safe error messages.
- `trade_psychology`: stores emotional and discipline inputs around a trade.
- `discipline_scores`: stores period-level rule adherence, risk control, emotion balance, revenge avoidance, time discipline, and total discipline score.
- `revenge_events`: stores detected revenge-trading patterns between trades.
- `trading_rules`: stores reusable manual and future automated pre-trade checklist rules.
- `trade_rule_checks`: stores rule pass/fail state for each trade.
- `trade_embeddings`: placeholder for vector memory. If pgvector is unavailable, the table is created without the vector column so the patch does not fail.
- `plans`: seeds Free, Pro, Trader+, and Team plan metadata.
- `user_usage`: tracks period usage counts for trade volume, AI reviews, and future OCR.

## Why Psychology Matters

TradeMind AI is not only a trade database. The psychology module lets the product measure confidence, stress, FOMO, emotional state, and discipline notes around real trades. This prepares the app for discipline scoring, weekly reports, and behavioral coaching.

## Why Vector Memory Matters

Vector memory will let the AI compare current trades with similar past trades and recurring mistakes. This enables answers such as "you usually lose when entering after high-impact news with no checklist confirmation" without hard-coding every pattern.

## Why AI Usage Logs Matter

AI usage logs prepare the product for cost controls, usage limits, model diagnostics, fallback tracking, and billing tiers. This is required before scaling real AI reviews, weekly reports, and memory retrieval.

## Why Plans Exist Before Payments

Plans are added now so feature limits and entitlement checks have a stable data model before Stripe or another billing provider is introduced. Payments are intentionally deferred.

## Roadmap

- Stage 12.1: Real AI env test
- Stage 13: AI usage logs integration
- Stage 14: Psychology module UI
- Stage 15: Discipline Score + Revenge Index
- Stage 16: Pre-Trade Checklist
- Stage 17: Vector Memory
- Stage 18: CSV Import
- Stage 19: Bybit read-only
- Stage 20: OKX read-only
