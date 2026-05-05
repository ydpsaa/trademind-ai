# Pre-Trade Checklist

Stage 16 adds user-defined trading rules and rule checks.

## Rule Types

Manual rules are checked by the trader while adding a manual trade. If a rule is left unchecked, TradeMind stores a failed rule check with an optional violation reason.

Auto rules use simple local conditions:

- `risk_percent <= value`
- `fomo_score <= value`
- avoid high-impact news when nearby events exist
- maximum trades per day
- cooldown after a losing trade

Auto checks are evaluated after form submission and saved to `trade_rule_checks`.

## Rule Adherence

Rule adherence is calculated from passed and failed `trade_rule_checks`. It powers:

- `/rules` summary
- `/psychology` discipline analytics
- dashboard rules preview
- AI Review checklist context

## Discipline Score

Discipline Score uses rule checks for the Rule Adherence component. Failed checks lower the score and surface checklist recommendations.

## AI Review Context

AI Review receives the current trade's rule checks. Failed checks lower local rules scoring and tell the AI to evaluate whether the trade respected the user's own checklist.

## Future Stages

This foundation does not block trades or execute orders. Future stages can add:

- trade blocking warnings
- push alerts
- cooldown enforcement
- strategy-specific rules
- broker/execution safety gates

Trading execution remains disabled.
