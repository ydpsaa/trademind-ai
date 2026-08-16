import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradePsychology } from "@/lib/psychology/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";
import { buildTradeMemoryContent } from "@/lib/vector-memory/content";
import { generateLocalEmbedding, getVectorMemoryModel, isVectorMemoryConfigured } from "@/lib/vector-memory/embedding-client";
import type { SimilarTradeMemory, TradeEmbedding, TradeMemoryResult } from "@/lib/vector-memory/types";

interface PrepareTradeMemoryInput {
  supabase: SupabaseClient;
  userId: string;
  trade: Trade;
  journalEntry: TradeJournalEntry | null;
  psychology?: TradePsychology | null;
  ruleChecks?: TradeRuleCheckWithRule[];
  strategyName?: string | null;
}

function safeMemoryError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return "Vector Memory is unavailable.";
}

export async function prepareTradeMemory(input: PrepareTradeMemoryInput): Promise<TradeMemoryResult> {
  if (!isVectorMemoryConfigured()) {
    return { status: "not_configured", memory: null, similarMemories: [], reason: "Local embeddings are not configured." };
  }

  try {
    const built = buildTradeMemoryContent(input);
    const embedding = await generateLocalEmbedding(built.content);
    const payload = {
      user_id: input.userId,
      trade_id: input.trade.id,
      embedding,
      embedding_model: getVectorMemoryModel(),
      content_hash: built.contentHash,
      content: built.content,
      summary: built.summary,
      metadata: built.metadata,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await input.supabase
      .from("trade_embeddings")
      .upsert(payload, { onConflict: "user_id,trade_id" })
      .select("id,user_id,trade_id,embedding_model,content_hash,content,summary,metadata,created_at,updated_at")
      .single();

    if (error || !data) throw new Error(error?.message || "Vector Memory could not be saved.");

    const { data: matches, error: matchError } = await input.supabase.rpc("match_trade_memories_for_trade", {
      p_trade_id: input.trade.id,
      p_match_count: 3,
      p_match_threshold: 0.45,
    });

    if (matchError) throw new Error(matchError.message);

    return {
      status: "ready",
      memory: data as TradeEmbedding,
      similarMemories: (matches ?? []) as SimilarTradeMemory[],
    };
  } catch (error) {
    const reason = safeMemoryError(error);
    console.warn("[vector-memory] memory preparation unavailable:", reason);
    return { status: "unavailable", memory: null, similarMemories: [], reason };
  }
}
