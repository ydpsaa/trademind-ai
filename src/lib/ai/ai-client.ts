import "server-only";
import { validateTradeReviewPayload, type TradeReviewPayload } from "@/lib/ai/review-schema";
import { buildTradeReviewPrompt } from "@/lib/ai/trade-review-prompt";
import type { NewsRiskLevel } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";

interface GenerateAITradeReviewInput {
  trade: Trade;
  journalEntry: TradeJournalEntry | null;
  baselineReview: TradeReviewPayload;
  economicEvents?: EconomicEvent[];
  newsRiskLevel?: NewsRiskLevel;
  newsRiskSummary?: string;
}

export interface AITradeReviewResult {
  review: TradeReviewPayload;
  model: string;
  provider: "openai";
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

export async function generateAITradeReview(input: GenerateAITradeReviewInput): Promise<AITradeReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.5-thinking";

  if (!apiKey) {
    throw new Error("AI API key is not configured.");
  }

  const prompt = buildTradeReviewPrompt(input);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You return valid JSON only for structured trading review generation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response did not include content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new Error("AI response was not valid JSON.");
  }

  const review = validateTradeReviewPayload(parsed);
  if (!review) {
    throw new Error("AI response did not match the review schema.");
  }

  return { review, model, provider: "openai" };
}
