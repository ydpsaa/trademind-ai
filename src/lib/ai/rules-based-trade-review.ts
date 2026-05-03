import { calculateNewsRiskScore, getNewsRiskSummary } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textIncludes(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

export function generateRulesBasedTradeReview(trade: Trade, journalEntry: TradeJournalEntry | null, nearbyEconomicEvents: EconomicEvent[] = []) {
  const notes = [
    journalEntry?.reason_for_entry,
    journalEntry?.notes_before,
    journalEntry?.notes_after,
    journalEntry?.setup_tags?.join(" "),
    journalEntry?.mistake_tags?.join(" "),
  ].filter(Boolean).join(" ");

  let structureScore = 50;
  let liquidityScore = 50;
  let ictScore = 50;
  let riskScore = 50;
  let newsScore = 62;
  let psychologyScore = 68;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (trade.stop_loss !== null && trade.take_profit !== null) {
    riskScore += 18;
    strengths.push("Defined stop loss and take profit before evaluation.");
  } else {
    riskScore -= 24;
    weaknesses.push("Missing stop loss or take profit reduces risk clarity.");
    recommendations.push("Define invalidation and target before entering every trade.");
  }

  if ((trade.rr ?? 0) >= 2) {
    riskScore += 14;
    strengths.push("Risk reward is at or above 2R.");
  } else if ((trade.rr ?? 0) > 0 && (trade.rr ?? 0) < 1.5) {
    riskScore -= 14;
    weaknesses.push("Risk reward is below 1.5R.");
    recommendations.push("Filter for setups with cleaner asymmetric reward.");
  }

  if ((trade.risk_percent ?? 0) > 0 && (trade.risk_percent ?? 0) <= 1) {
    riskScore += 10;
    strengths.push("Risk per trade is controlled at 1% or less.");
  } else if ((trade.risk_percent ?? 0) > 2) {
    riskScore -= 20;
    weaknesses.push("Risk percentage is above 2%.");
    recommendations.push("Reduce position sizing until execution is consistent.");
  }

  if (textIncludes(notes, ["bos", "break of structure", "choch"])) {
    structureScore += 22;
    strengths.push("Structure confirmation was documented.");
  }

  if (textIncludes(notes, ["liquidity", "sweep", "stop hunt"])) {
    liquidityScore += 24;
    strengths.push("Liquidity context was part of the trade thesis.");
  }

  if (textIncludes(notes, ["fvg", "fair value gap", "order block", "discount", "premium", "ict", "smart money"])) {
    ictScore += 22;
    strengths.push("Smart Money / ICT concepts were explicitly documented.");
  }

  if (!journalEntry?.reason_for_entry) {
    structureScore -= 12;
    liquidityScore -= 10;
    ictScore -= 10;
    weaknesses.push("Reason for entry is missing.");
    recommendations.push("Write the entry thesis before or immediately after taking the setup.");
  }

  if (trade.result === "Win") {
    structureScore += 4;
    riskScore += 4;
  } else if (trade.result === "Loss") {
    recommendations.push("Review whether the loss followed the written plan before changing the strategy.");
  }

  if (trade.session === "London" || trade.session === "New York") {
    structureScore += 5;
    liquidityScore += 5;
    strengths.push(`${trade.session} session provides useful liquidity and volatility context.`);
  }

  if (textIncludes(notes, ["fear", "revenge", "fomo", "overtrade", "chased", "impulsive"])) {
    psychologyScore -= 24;
    weaknesses.push("Psychology notes suggest emotional execution pressure.");
    recommendations.push("Add a pre-trade checklist pause when emotional keywords appear.");
  } else if (journalEntry?.notes_after || journalEntry?.notes_before) {
    psychologyScore += 8;
    strengths.push("Trade notes support post-trade reflection.");
  }

  if (nearbyEconomicEvents.length) {
    newsScore = calculateNewsRiskScore(nearbyEconomicEvents);
    recommendations.push(getNewsRiskSummary(nearbyEconomicEvents));

    if (nearbyEconomicEvents.some((event) => event.impact === "High")) {
      weaknesses.push("Trade was opened near a high-impact economic event.");
      recommendations.push("Avoid opening new positions during high-impact news windows unless this is part of a tested news strategy.");
    } else if (nearbyEconomicEvents.some((event) => event.impact === "Medium")) {
      weaknesses.push("Trade was opened near medium-impact economic news.");
      recommendations.push("Reduce risk or wait for volatility to normalize around scheduled news.");
    } else {
      weaknesses.push("Low-impact economic events were near the trade open time.");
    }
  } else if (!textIncludes(notes, ["news", "cpi", "fomc", "nfp", "rate", "fed"])) {
    newsScore = 90;
    strengths.push("No major economic event was detected near the trade open time.");
  } else {
    newsScore += 10;
    strengths.push("News context was considered.");
  }

  const scores = {
    structure_score: clamp(structureScore),
    liquidity_score: clamp(liquidityScore),
    ict_score: clamp(ictScore),
    risk_score: clamp(riskScore),
    news_score: clamp(newsScore),
    psychology_score: clamp(psychologyScore),
  };

  const totalScore = clamp(
    scores.structure_score * 0.18 +
    scores.liquidity_score * 0.16 +
    scores.ict_score * 0.16 +
    scores.risk_score * 0.24 +
    scores.news_score * 0.1 +
    scores.psychology_score * 0.16
  );

  if (!strengths.length) {
    strengths.push("Trade has enough core data to begin structured review.");
  }

  if (!weaknesses.length) {
    weaknesses.push("No major rule-based weakness detected from the current journal data.");
  }

  if (!recommendations.length) {
    recommendations.push("Keep documenting structure, liquidity, risk, and psychology for each trade.");
  }

  const summary =
    totalScore >= 75
      ? "Strong rule-based review. The trade shows clear planning and risk structure, with room to keep refining documentation."
      : totalScore >= 60
        ? "Solid trade review. The setup has useful structure, but more complete notes and risk context would improve confidence."
        : "Developing trade review. Focus on clearer entry reasoning, complete risk parameters, and emotional discipline notes.";

  return {
    total_score: totalScore,
    ...scores,
    summary,
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    recommendations: [...new Set(recommendations)],
  };
}
