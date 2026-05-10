import type { TradeQualityScore, TradingOSContext } from "@/lib/trading-os/types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateTradeReadiness(context: TradingOSContext): TradeQualityScore {
  const mainRisks: string[] = [];
  const recommendations: string[] = [];

  if (!context.data_availability.trade && !context.data_availability.rule_checks && !context.data_availability.psychology) {
    return {
      status: "not_enough_data",
      score: 0,
      main_risks: ["Not enough real trading data yet."],
      recommendations: ["Add trades, checklist results, and psychology notes to build readiness context."],
    };
  }

  let score = 85;

  if (context.news.high_impact_events_count > 0) {
    score -= context.news.high_impact_events_count > 1 ? 30 : 20;
    mainRisks.push("High-impact news risk");
    recommendations.push("Review news exposure before entering new positions.");
  } else if (context.news.status === "sample") {
    mainRisks.push("Calendar contains sample events");
    recommendations.push("Use verified manual or provider calendar data for news decisions.");
  } else if (!context.data_availability.news) {
    mainRisks.push("News context unavailable");
  }

  if (context.psychology.risk_level === "high") {
    score -= 20;
    mainRisks.push("Psychology risk elevated");
    recommendations.push("Review stress, FOMO, and emotional state before making decisions.");
  } else if (context.psychology.risk_level === "medium") {
    score -= 10;
    mainRisks.push("Psychology risk requires review");
  }

  if (context.rules.failed_checks > 0) {
    score -= Math.min(30, context.rules.failed_checks * 8);
    mainRisks.push(`${context.rules.failed_checks} checklist rule(s) failed`);
    recommendations.push("Do not ignore failed pre-trade checklist items.");
  }

  if (context.revenge.trade_is_involved && (context.revenge.max_score ?? 0) >= 0.7) {
    score -= 25;
    mainRisks.push("Potential revenge trading pattern");
    recommendations.push("Use a cooldown after losses before opening another trade.");
  }

  if (context.strategy.status === "not_linked" && context.data_availability.trade) {
    score -= 5;
    mainRisks.push("No strategy linked");
    recommendations.push("Link trades to a strategy when possible for cleaner review loops.");
  }

  if (context.risk.risk_percent != null) {
    if (context.risk.risk_percent > 3) {
      score -= 25;
      mainRisks.push("Risk percent is very high");
      recommendations.push("Review risk sizing before taking similar trades.");
    } else if (context.risk.risk_percent > 1) {
      score -= 10;
      mainRisks.push("Risk percent above conservative baseline");
    }
  } else {
    score -= 5;
    mainRisks.push("Risk percent missing");
  }

  if (!context.data_availability.market_data) {
    recommendations.push("Real market data is not connected yet, so structure context remains journal-based.");
  }

  const finalScore = clampScore(score);
  const status = finalScore < 45 ? "blocked" : finalScore < 75 ? "caution" : "allowed";

  return {
    status,
    score: finalScore,
    main_risks: mainRisks.length ? mainRisks : ["No major journal-based risk detected."],
    recommendations: recommendations.length ? Array.from(new Set(recommendations)) : ["Continue following your checklist and journal process."],
  };
}
