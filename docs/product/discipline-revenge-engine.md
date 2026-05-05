# Discipline Score and Revenge Index Engine

Stage 15 turns the psychology foundation into saved behavioral analytics.

## Discipline Score Formula

The score is a 0-100 weighted average:

- Rule Adherence: 30%
- Risk Control: 25%
- Emotion Balance: 20%
- Revenge Avoidance: 15%
- Time Discipline: 10%

Rule adherence uses `trade_rule_checks` when available. If no checks exist, it uses a neutral score so early users are not punished before the checklist module is built.

Risk control uses `trading_profiles.max_trade_risk` when present, otherwise a default 1% max risk.

Emotion balance rewards neutral/confident states and penalizes fear, greed, FOMO, revenge, anxiety, and tiredness.

Time discipline is currently a simple preferred-session alignment check. If preferred sessions are missing, it uses a neutral score.

## Revenge Index Rules

The engine detects a losing trade followed by another trade within five minutes. The score increases when:

- the previous trade lost money
- the next trade was opened within five minutes
- the next position size increased more than 1.5x
- the next trade risk percent increased
- the next emotion was FOMO, greed, or revenge
- discipline checks were missing or failed

Detected events are saved in `revenge_events` without duplicate previous/next trade pairs.

## Product Limits

This is behavioral trading analysis only. It is not medical, psychological, or mental-health diagnosis.

The engine is intentionally transparent and rules-based. Future versions can add:

- push alerts after losses
- weekly AI discipline reports
- pre-trade checklist enforcement
- cooldown reminders
- trend charts for discipline score history

## AI Review Context

AI Trade Review now receives latest Discipline Score and any Revenge Events involving the current trade. The local rules engine can lower psychology score and add cooldown/checklist recommendations when a trade is connected to a high revenge-risk pattern.
