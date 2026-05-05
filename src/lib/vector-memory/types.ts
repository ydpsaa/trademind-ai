export interface TradeEmbedding {
  id: string;
  user_id: string;
  trade_id: string;
  embedding?: number[] | null;
  embedding_model: string | null;
  content_hash: string | null;
  created_at: string;
}

export interface TradeEmbeddingInput {
  trade_id: string;
  embedding?: number[] | null;
  embedding_model?: string | null;
  content_hash?: string | null;
}

export interface SimilarTradeMemory {
  trade_id: string;
  similarity: number;
  summary: string;
}
