export interface TradeReviewPayload {
  total_score: number;
  structure_score: number;
  liquidity_score: number;
  ict_score: number;
  risk_score: number;
  news_score: number;
  psychology_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const scoreKeys = [
  "total_score",
  "structure_score",
  "liquidity_score",
  "ict_score",
  "risk_score",
  "news_score",
  "psychology_score",
] as const;

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return strings.length ? strings.slice(0, 8) : null;
}

export function validateTradeReviewPayload(value: unknown): TradeReviewPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, normalizeScore(input[key])])) as Record<(typeof scoreKeys)[number], number | null>;

  if (scoreKeys.some((key) => scores[key] === null)) {
    return null;
  }

  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const strengths = normalizeStringArray(input.strengths);
  const weaknesses = normalizeStringArray(input.weaknesses);
  const recommendations = normalizeStringArray(input.recommendations);

  if (!summary || !strengths || !weaknesses || !recommendations) {
    return null;
  }

  return {
    total_score: scores.total_score as number,
    structure_score: scores.structure_score as number,
    liquidity_score: scores.liquidity_score as number,
    ict_score: scores.ict_score as number,
    risk_score: scores.risk_score as number,
    news_score: scores.news_score as number,
    psychology_score: scores.psychology_score as number,
    summary,
    strengths,
    weaknesses,
    recommendations,
  };
}
