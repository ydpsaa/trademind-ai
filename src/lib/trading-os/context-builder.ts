import { getNewsRiskLevel, getNewsRiskSummary } from "@/lib/calendar/news-risk";
import type { BuildTradeContextInput, TradingOSContext } from "@/lib/trading-os/types";

const riskyEmotions = new Set(["fear", "greed", "fomo", "revenge", "anxious", "tired"]);

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildAccountContext({ trade, account }: Pick<BuildTradeContextInput, "trade" | "account">) {
  if (account) {
    return {
      status: account.provider === "manual" ? ("manual" as const) : ("linked" as const),
      account_id: account.id,
      provider: account.provider || "manual",
      account_name: account.account_name || "Trading Account",
      source: trade?.source ?? account.provider ?? "manual",
    };
  }

  return {
    status: trade?.source && trade.source !== "manual" ? ("not_connected" as const) : ("manual" as const),
    account_id: trade?.trading_account_id ?? null,
    provider: trade?.source || "manual",
    account_name: trade?.source && trade.source !== "manual" ? "External account not connected" : "Manual Journal",
    source: trade?.source ?? "manual",
  };
}

function buildPsychologyContext(psychology: BuildTradeContextInput["psychology"]) {
  if (!psychology) {
    return {
      status: "missing" as const,
      emotion_before: null,
      confidence_level: null,
      stress_level: null,
      fomo_score: null,
      risk_level: "unknown" as const,
      summary: "No psychology data recorded.",
    };
  }

  const emotion = psychology.emotion_before;
  const stress = toNumber(psychology.stress_level);
  const fomo = toNumber(psychology.fomo_score);
  const isHighRisk = emotion === "revenge" || emotion === "fomo" || stress != null && stress >= 8 || fomo != null && fomo >= 8;
  const isMediumRisk = riskyEmotions.has(emotion || "") || stress != null && stress >= 6 || fomo != null && fomo >= 6;

  return {
    status: "available" as const,
    emotion_before: psychology.emotion_before,
    confidence_level: toNumber(psychology.confidence_level),
    stress_level: stress,
    fomo_score: fomo,
    risk_level: isHighRisk ? ("high" as const) : isMediumRisk ? ("medium" as const) : ("low" as const),
    summary: isHighRisk ? "Psychology risk is elevated." : isMediumRisk ? "Psychology risk requires review." : "Psychology context is stable.",
  };
}

function buildRulesContext(ruleChecks: BuildTradeContextInput["ruleChecks"] = []) {
  const passed = ruleChecks.filter((check) => check.passed === true).length;
  const failed = ruleChecks.filter((check) => check.passed === false).length;

  return {
    status: ruleChecks.length ? ("available" as const) : ("missing" as const),
    total_checks: ruleChecks.length,
    passed_checks: passed,
    failed_checks: failed,
    failed_rules: ruleChecks.filter((check) => check.passed === false).map((check) => check.trading_rules?.text || "Checklist rule"),
    adherence: ruleChecks.length ? Math.round((passed / ruleChecks.length) * 100) : null,
    checks: ruleChecks,
  };
}

export function buildTradeContext(input: BuildTradeContextInput): TradingOSContext {
  const trade = input.trade ?? null;
  const economicEvents = input.economicEvents ?? [];
  const highImpactCount = economicEvents.filter((event) => event.impact === "High").length;
  const allEventsSample = economicEvents.length > 0 && economicEvents.every((event) => event.source === "sample");
  const riskPercent = toNumber(trade?.risk_percent);
  const rr = toNumber(trade?.rr);
  const rules = buildRulesContext(input.ruleChecks);
  const psychology = buildPsychologyContext(input.psychology);
  const revengeEvents = input.revengeEvents ?? [];
  const tradeIsInvolved = Boolean(trade?.id && revengeEvents.some((event) => event.previous_trade_id === trade.id || event.next_trade_id === trade.id));
  const maxRevengeScore = revengeEvents.reduce<number | null>((max, event) => {
    const score = toNumber(event.revenge_score);
    if (score === null) return max;
    return max === null ? score : Math.max(max, score);
  }, null);

  return {
    lifecycle_stage: input.lifecycleStage ?? (trade ? "review" : "before_trade"),
    trade_id: trade?.id ?? null,
    symbol: trade?.symbol ?? null,
    account: buildAccountContext({ trade, account: input.account }),
    strategy: input.strategy
      ? {
          status: "linked",
          strategy_id: input.strategy.id,
          name: input.strategy.name,
          rules_json: input.strategy.rules_json ?? null,
        }
      : {
          status: "not_linked",
          strategy_id: trade?.strategy_id ?? null,
          name: null,
          rules_json: null,
        },
    risk: {
      status: riskPercent !== null || rr !== null || trade?.stop_loss != null || trade?.take_profit != null ? "available" : "missing",
      risk_percent: riskPercent,
      rr,
      has_stop_loss: trade?.stop_loss != null,
      has_take_profit: trade?.take_profit != null,
      summary: riskPercent !== null ? `Recorded risk is ${riskPercent}%.` : "No risk percentage recorded.",
    },
    news: {
      status: economicEvents.length ? (allEventsSample ? "sample" : "available") : "missing",
      risk_level: economicEvents.length ? getNewsRiskLevel(economicEvents) : "Unknown",
      nearby_events_count: economicEvents.length,
      high_impact_events_count: highImpactCount,
      summary: economicEvents.length ? getNewsRiskSummary(economicEvents) : "No economic event context available.",
      events: economicEvents,
    },
    psychology,
    rules,
    discipline: {
      status: input.latestDisciplineScore ? "available" : "missing",
      total_score: toNumber(input.latestDisciplineScore?.total_score),
      rule_adherence: toNumber(input.latestDisciplineScore?.rule_adherence),
      risk_control: toNumber(input.latestDisciplineScore?.risk_control),
      emotion_balance: toNumber(input.latestDisciplineScore?.emotion_balance),
      latest_score: input.latestDisciplineScore ?? null,
    },
    revenge: {
      status: revengeEvents.length ? "available" : "missing",
      events_count: revengeEvents.length,
      max_score: maxRevengeScore,
      trade_is_involved: tradeIsInvolved,
      events: revengeEvents,
    },
    data_availability: {
      trade: Boolean(trade),
      account: Boolean(input.account) || trade?.source === "manual",
      strategy: Boolean(input.strategy),
      risk: riskPercent !== null || rr !== null,
      news: economicEvents.length > 0,
      psychology: Boolean(input.psychology),
      rule_checks: rules.total_checks > 0,
      discipline_score: Boolean(input.latestDisciplineScore),
      revenge_events: revengeEvents.length > 0,
      market_data: false,
    },
    prop_readiness: {
      status: "not_available",
      reason: "Prop Readiness will be available in a later stage.",
    },
  };
}
