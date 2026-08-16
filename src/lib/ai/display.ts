export function formatAIModelLabel(model?: string | null) {
  if (!model) return null;

  const normalized = model.toLowerCase();
  if (normalized === "local-rules" || normalized === "local-review-engine") return "Local review engine";
  if (normalized.includes("qwen") || normalized.includes("llama") || normalized.includes("mistral") || normalized.includes("ollama")) return "Local AI model";
  if (normalized.includes("openai") || normalized.includes("gpt") || normalized.includes("grok") || normalized.includes("xai")) return "Configured AI model";

  return model;
}
