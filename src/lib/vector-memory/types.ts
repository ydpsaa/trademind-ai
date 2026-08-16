export const VECTOR_MEMORY_DIMENSIONS = 1536;

export type VectorMemoryStatus = "ready" | "not_configured" | "unavailable";

export interface TradeMemoryMetadata {
  symbol: string;
  direction: string;
  result: string | null;
  session: string | null;
  source: string | null;
  opened_at: string | null;
}

export interface TradeEmbedding {
  id: string;
  user_id: string;
  trade_id: string;
  embedding?: number[] | null;
  embedding_model: string | null;
  content_hash: string | null;
  content: string;
  summary: string | null;
  metadata: TradeMemoryMetadata | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TradeEmbeddingInput {
  trade_id: string;
  embedding?: number[] | null;
  embedding_model?: string | null;
  content_hash?: string | null;
  content?: string;
  summary?: string | null;
  metadata?: TradeMemoryMetadata | Record<string, unknown>;
}

export interface SimilarTradeMemory {
  memory_id: string;
  trade_id: string;
  similarity: number;
  summary: string | null;
  metadata: TradeMemoryMetadata | Record<string, unknown>;
  embedding_model: string | null;
  created_at: string;
}

export interface TradeMemoryResult {
  status: VectorMemoryStatus;
  memory: TradeEmbedding | null;
  similarMemories: SimilarTradeMemory[];
  reason?: string;
}
