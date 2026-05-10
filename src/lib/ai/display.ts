export function formatAIModelLabel(model?: string | null) {
  if (!model) return null;

  const normalized = model.toLowerCase();
  if (normalized === "local-rules" || normalized === "local-review-engine") return "Local review engine";
  if (normalized.includes("openai") || normalized.includes("gpt") || normalized.includes("grok") || normalized.includes("xai")) return "Configured AI model";

  return model;
}
