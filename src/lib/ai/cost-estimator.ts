import "server-only";

interface EstimateAIReviewCostInput {
  provider?: string | null;
  model?: string | null;
  generation_source?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
}

const PLACEHOLDER_TOKEN_PRICES_USD: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  "openai:gpt-5.5-thinking": {
    inputPerMillion: 10,
    outputPerMillion: 30,
  },
};

export function estimateAIReviewCost(input: EstimateAIReviewCostInput) {
  if (input.generation_source === "rules" || input.provider === "local") {
    return 0;
  }

  const inputTokens = input.input_tokens;
  const outputTokens = input.output_tokens;

  if (!input.provider || !input.model || inputTokens == null || outputTokens == null) {
    return null;
  }

  const price = PLACEHOLDER_TOKEN_PRICES_USD[`${input.provider}:${input.model}`];
  if (!price) {
    return null;
  }

  return (inputTokens / 1_000_000) * price.inputPerMillion + (outputTokens / 1_000_000) * price.outputPerMillion;
}
