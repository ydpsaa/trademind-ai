alter table if exists public.ai_trade_reviews
  add column if not exists generation_source text default 'rules',
  add column if not exists model text;
