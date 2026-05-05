import type { RuleStats, TradeRuleCheckWithRule, TradingRule } from "@/lib/rules/types";

export function calculateRuleStats(rules: TradingRule[], checks: TradeRuleCheckWithRule[] = []): RuleStats {
  const activeRules = rules.filter((rule) => rule.active);
  const passedChecks = checks.filter((check) => check.passed === true).length;
  const failedChecks = checks.filter((check) => check.passed === false).length;
  const violationCounts = new Map<string, { text: string; count: number }>();

  for (const check of checks) {
    if (check.passed !== false) continue;
    const ruleId = check.rule_id;
    const text = check.trading_rules?.text ?? "Unknown rule";
    const current = violationCounts.get(ruleId) ?? { text, count: 0 };
    violationCounts.set(ruleId, { text, count: current.count + 1 });
  }

  const topViolatedRule = [...violationCounts.values()].sort((a, b) => b.count - a.count)[0]?.text ?? "None";
  const sortedChecks = [...checks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  let streak = 0;

  for (const check of sortedChecks) {
    if (check.passed === false) break;
    if (check.passed === true) streak += 1;
  }

  return {
    totalActiveRules: activeRules.length,
    totalRuleChecks: checks.length,
    passedChecks,
    failedChecks,
    ruleAdherence: checks.length ? (passedChecks / checks.length) * 100 : 0,
    topViolatedRule,
    currentStreakWithoutViolation: streak,
  };
}
