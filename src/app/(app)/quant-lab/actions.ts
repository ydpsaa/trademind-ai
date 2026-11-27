"use server";

import { runHistoricalResearch } from "@/lib/quant/historical-engine";
import { HistoricalFeedError, readHistoricalCandles } from "@/lib/quant/historical-feed";
import { HistoricalInputError, parseHistoricalResearchForm } from "@/lib/quant/historical-research";
import type { HistoricalResearchActionState } from "@/lib/quant/historical-research";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function runHistoricalResearchAction(
  _previousState: HistoricalResearchActionState,
  formData: FormData,
): Promise<HistoricalResearchActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sign in to run historical research." };
  const client = await createSupabaseServerClient();
  if (!client) return { status: "error", message: "Market Data Feed storage is unavailable." };

  try {
    const request = parseHistoricalResearchForm(formData, Date.now());
    const { bars, provenance } = await readHistoricalCandles(client, request.feed);
    const result = runHistoricalResearch({ [request.engine.symbol]: bars }, request.engine);
    return { status: "success", configuration: request.configuration, provenance, result };
  } catch (error) {
    if (error instanceof HistoricalInputError || error instanceof HistoricalFeedError) {
      return { status: "error", message: error.message };
    }
    // Unexpected failures stay on the server. Never emit results without verified candle coverage.
    console.error("Quant Lab historical run failed", error instanceof Error ? error.name : "UnknownError");
    return { status: "error", message: "Historical research could not finish. Check the range and settings, then try again." };
  }
}
