# AI Usage Logs and Cost Control

Stage 13 adds observability for AI-powered features without enabling billing or hard limits.

## What Is Logged

Every Generate or Regenerate AI Review action writes an `ai_usage_logs` row when the review is saved:

- `feature`: currently `trade_review`
- `provider`: `local` or the configured AI service provider
- `model`: `local-rules` or the configured model name
- `generation_source`: `rules` or `ai`
- token counts when the provider returns them
- estimated cost when enough data is available
- status: `success`, `fallback`, or `error`
- safe error message for fallback diagnostics

Logging is non-fatal. If the usage log write fails, the user still receives the AI review.

## Cost Estimates

Local rules cost is always `0`.

Real AI cost estimates are placeholders based on rough token pricing assumptions. They are useful for product telemetry and future billing design, but they are not exact invoice data.

## Monthly Usage Counter

The `user_usage` table tracks current monthly usage for:

- AI reviews
- future trade count limits
- future OCR usage

Stage 13 increments `ai_reviews_count` after a review is generated or regenerated successfully. It does not block the user yet.

## Future Product Use

This foundation prepares:

- Free and Pro plan limits
- AI cost monitoring
- usage-based warnings
- weekly AI report quotas
- vector memory quotas
- billing and Stripe integration in a later stage

## Safety

No API keys are logged.
No service role key is exposed to the browser.
No global or cross-user usage data is shown in the UI.
System Status and Settings only display usage for the current authenticated user.
