import type { TradeReviewPayload } from "@/lib/ai/review-schema";
import type { NewsRiskLevel } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";

interface TradeReviewPromptInput {
  trade: Trade;
  journalEntry: TradeJournalEntry | null;
  baselineReview: TradeReviewPayload;
  economicEvents?: EconomicEvent[];
  newsRiskLevel?: NewsRiskLevel;
  newsRiskSummary?: string;
  psychology?: TradePsychology | null;
  disciplineScore?: DisciplineScore | null;
  revengeEvents?: RevengeEvent[];
  ruleChecks?: TradeRuleCheckWithRule[];
}

const jsonShape = {
  total_score: 0,
  structure_score: 0,
  liquidity_score: 0,
  ict_score: 0,
  risk_score: 0,
  news_score: 0,
  psychology_score: 0,
  summary: "",
  strengths: [""],
  weaknesses: [""],
  recommendations: [""],
};

export function buildTradeReviewPrompt({ trade, journalEntry, baselineReview, economicEvents = [], newsRiskLevel = "Low", newsRiskSummary = "No economic events were detected inside the configured risk window.", psychology = null, disciplineScore = null, revengeEvents = [], ruleChecks = [] }: TradeReviewPromptInput) {
  return [
    "You are an AI trading coach for TradeMind AI.",
    "Analyze execution quality, not only result. Use Smart Money / ICT concepts and evaluate market structure, liquidity, risk, psychology, and news context.",
    "Do not guarantee profit. Do not provide financial advice. Evaluate the quality of the execution, not only the trade result.",
    "Psychology analysis must stay focused on trading behavior and discipline. Do not diagnose mental health or make medical claims.",
    "Use only the provided trade and journal data. If market data or news data is missing, state that the review is based only on journal/trade inputs.",
    "If nearby economic events exist, evaluate news risk explicitly. If no events are available, state that news context is limited. Do not invent price action or news.",
    "Evaluate whether the trade respected the user's own pre-trade checklist. Failed rule checks should affect execution-quality feedback.",
    "Return valid JSON only. Do not wrap JSON in markdown. Scores must be numbers from 0 to 100.",
    "",
    "Required JSON shape:",
    JSON.stringify(jsonShape, null, 2),
    "",
    "Trade data:",
    JSON.stringify(
      {
        symbol: trade.symbol,
        market_type: trade.market_type,
        direction: trade.direction,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        position_size: trade.position_size,
        risk_percent: trade.risk_percent,
        rr: trade.rr,
        pnl: trade.pnl,
        result: trade.result,
        session: trade.session,
        source: trade.source,
        opened_at: trade.opened_at,
        closed_at: trade.closed_at,
      },
      null,
      2,
    ),
    "",
    "Psychology data:",
    JSON.stringify(
      {
        emotion_before: psychology?.emotion_before ?? null,
        emotion_after: psychology?.emotion_after ?? null,
        confidence_level: psychology?.confidence_level ?? null,
        stress_level: psychology?.stress_level ?? null,
        fomo_score: psychology?.fomo_score ?? null,
        discipline_note: psychology?.discipline_note ?? null,
      },
      null,
      2,
    ),
    "",
    "Discipline and revenge context:",
    JSON.stringify(
      {
        latest_discipline_score: disciplineScore
          ? {
              period_type: disciplineScore.period_type,
              total_score: disciplineScore.total_score,
              rule_adherence: disciplineScore.rule_adherence,
              risk_control: disciplineScore.risk_control,
              emotion_balance: disciplineScore.emotion_balance,
              revenge_avoidance: disciplineScore.revenge_avoidance,
              time_discipline: disciplineScore.time_discipline,
              created_at: disciplineScore.created_at,
            }
          : null,
        relevant_revenge_events: revengeEvents.map((event) => ({
          previous_trade_id: event.previous_trade_id,
          next_trade_id: event.next_trade_id,
          revenge_score: event.revenge_score,
          gap_minutes: event.gap_minutes,
          size_increase_ratio: event.size_increase_ratio,
          triggered_rules: event.triggered_rules,
          created_at: event.created_at,
        })),
      },
      null,
      2,
    ),
    "",
    "Pre-trade checklist rule checks:",
    JSON.stringify(
      ruleChecks.map((check) => ({
        rule: check.trading_rules?.text ?? null,
        type: check.trading_rules?.type ?? null,
        passed: check.passed,
        violation_reason: check.violation_reason,
      })),
      null,
      2,
    ),
    "",
    "Journal data:",
    JSON.stringify(
      {
        reason_for_entry: journalEntry?.reason_for_entry ?? null,
        emotion_before: journalEntry?.emotion_before ?? null,
        emotion_after: journalEntry?.emotion_after ?? null,
        notes_before: journalEntry?.notes_before ?? null,
        notes_after: journalEntry?.notes_after ?? null,
        setup_tags: journalEntry?.setup_tags ?? [],
        mistake_tags: journalEntry?.mistake_tags ?? [],
      },
      null,
      2,
    ),
    "",
    "Economic calendar context near trade open time:",
    JSON.stringify(
      {
        news_risk_level: newsRiskLevel,
        news_risk_summary: newsRiskSummary,
        nearby_events: economicEvents.map((event) => ({
          currency: event.currency,
          title: event.title,
          impact: event.impact,
          event_time: event.event_time,
          actual: event.actual,
          forecast: event.forecast,
          previous: event.previous,
          source: event.source,
        })),
      },
      null,
      2,
    ),
    "",
    "Local baseline review for calibration. You may improve it, but keep the same JSON shape:",
    JSON.stringify(baselineReview, null, 2),
  ].join("\n");
}
