import "server-only";
import { getOllamaBaseUrl } from "@/lib/ai/provider";
import { VECTOR_MEMORY_DIMENSIONS } from "@/lib/vector-memory/types";

interface OllamaEmbedResponse {
  embeddings?: unknown;
}

export function getVectorMemoryModel() {
  return process.env.OLLAMA_EMBEDDING_MODEL?.trim() || "nomic-embed-text";
}

export function isVectorMemoryConfigured() {
  return process.env.VECTOR_MEMORY_PROVIDER?.trim().toLowerCase() === "ollama"
    || process.env.AI_PROVIDER?.trim().toLowerCase() === "ollama"
    || Boolean(process.env.OLLAMA_EMBEDDING_MODEL?.trim());
}

function normalizeEmbedding(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "number" || !Number.isFinite(item))) {
    throw new Error("Local embedding response is invalid.");
  }

  if (value.length > VECTOR_MEMORY_DIMENSIONS) {
    throw new Error(`Embedding dimensions exceed ${VECTOR_MEMORY_DIMENSIONS}.`);
  }

  const embedding = value as number[];
  return embedding.length === VECTOR_MEMORY_DIMENSIONS
    ? embedding
    : [...embedding, ...Array<number>(VECTOR_MEMORY_DIMENSIONS - embedding.length).fill(0)];
}

export async function generateLocalEmbedding(input: string) {
  if (!isVectorMemoryConfigured()) {
    throw new Error("Vector Memory is not configured.");
  }

  const response = await fetch(`${getOllamaBaseUrl()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: getVectorMemoryModel(), input }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Local embedding service returned ${response.status}.`);
  }

  const payload = await response.json() as OllamaEmbedResponse;
  const firstEmbedding = Array.isArray(payload.embeddings) ? payload.embeddings[0] : null;
  return normalizeEmbedding(firstEmbedding);
}
