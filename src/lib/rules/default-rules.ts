import type { TradingRuleInput } from "@/lib/rules/types";

export const defaultTradingRules: TradingRuleInput[] = [
  {
    text: "Risk not above 1%",
    type: "auto_check",
    auto_condition: { field: "risk_percent", operator: "lte", value: 1 },
    active: true,
  },
  {
    text: "Trade only with valid setup",
    type: "manual_check",
    active: true,
  },
  {
    text: "Wait for confirmation before entry",
    type: "manual_check",
    active: true,
  },
  {
    text: "No trade during high-impact news",
    type: "manual_check",
    active: true,
  },
  {
    text: "No revenge trade after loss",
    type: "manual_check",
    active: true,
  },
  {
    text: "Maximum 3 trades per day",
    type: "auto_check",
    auto_condition: { field: "trades_per_day", operator: "lte", value: 3 },
    active: true,
  },
  {
    text: "Follow planned SL and TP",
    type: "manual_check",
    active: true,
  },
  {
    text: "Do not trade when FOMO is high",
    type: "auto_check",
    auto_condition: { field: "fomo_score", operator: "lte", value: 6 },
    active: true,
  },
];
