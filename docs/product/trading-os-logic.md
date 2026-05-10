# Stage 0.0.4 — Trading OS Logic Refactor

TradeMind AI now treats the app as one connected Trading OS instead of isolated modules.

## Trade Lifecycle

1. **Before Trade**
   - Strategy context
   - Risk plan
   - News risk
   - Psychology state
   - Pre-trade checklist
   - Account/source context

2. **Trade Entry**
   - Manual journal entry today
   - Future CSV, Bybit, OKX, and MetaTrader imports
   - Account/source ownership by authenticated `user_id`

3. **After Trade**
   - Journal record
   - Rule checks
   - Psychology notes
   - News context around open time
   - AI Review

4. **Review**
   - AI Review receives normalized Trading OS context
   - Local review engine still works without real AI
   - Missing market data is explicitly marked unavailable

5. **Improvement**
   - Discipline Score
   - Revenge Index
   - Rule adherence
   - Strategy feedback
   - Future Vector Memory

## Shared Context

The shared Trading OS context lives in:

- `src/lib/trading-os/types.ts`
- `src/lib/trading-os/context-builder.ts`
- `src/lib/trading-os/readiness.ts`

It normalizes:

- Account context
- Strategy context
- Risk context
- News context
- Psychology context
- Rules/checklist context
- Discipline context
- Revenge context
- Data availability flags

## Real Data Or No Data

The Trading OS layer does not invent market data, account balances, scanner values, signal confidence, or prop readiness scores.

If data is unavailable, the UI should show:

- `Not enough data`
- `Not connected`
- `Manual Journal`
- `No strategy linked`
- `No checklist recorded`

## Dashboard

The Dashboard now includes a compact Trading OS summary. It answers:

- Can the trader review today’s risk?
- What is the main current risk?
- Is psychology risk elevated?
- Is rule discipline available?
- Is account data manual or connected?

The summary uses only current user data from Supabase and local context helpers.

## Journal Detail

Each trade detail page now includes a Trade Context section connecting:

- Account/source
- Strategy
- Checklist adherence
- Psychology risk
- News risk
- Discipline Score
- AI Review status
- Market data availability

## AI Review

AI Review now receives the normalized Trading OS context in addition to the existing trade, journal, psychology, rules, discipline, revenge, and news inputs.

The prompt tells AI not to invent missing market data and to use the context availability flags.

## Future Readiness

This refactor prepares:

- Stage 17 Vector Memory
- Stage 18 CSV Import
- Stage 19 Bybit Read-Only
- Stage 20 OKX Read-Only
- Future Prop Readiness

Prop Readiness is represented only as a placeholder context object. No score, route, or fake analytics are created in this stage.
