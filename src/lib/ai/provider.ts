import "server-only";

export type AIProvider = "openai" | "ollama";

export function getConfiguredAIProvider(): AIProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "ollama" ? "ollama" : "openai";
}

export function getConfiguredAIModel(provider: AIProvider = getConfiguredAIProvider()) {
  if (provider === "ollama") {
    return process.env.OLLAMA_MODEL?.trim() || "qwen2.5:3b";
  }

  return process.env.OPENAI_MODEL?.trim() || "gpt-5.5-thinking";
}

export function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434").replace(/\/+$/, "");
}

export function isConfiguredAIProviderAvailable() {
  const provider = getConfiguredAIProvider();
  if (provider === "ollama") return true;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
