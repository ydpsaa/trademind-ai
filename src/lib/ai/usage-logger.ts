import "server-only";
import type { AIUsageLogInput } from "@/lib/ai/usage-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 240);
  return "Unknown usage logging error";
}

export async function logAIUsage(input: AIUsageLogInput) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      console.warn("[ai-usage] Data service is not configured; usage log skipped.");
      return { success: false };
    }

    const { error } = await supabase.from("ai_usage_logs").insert({
      user_id: input.user_id,
      feature: input.feature,
      provider: input.provider ?? null,
      model: input.model ?? null,
      generation_source: input.generation_source ?? null,
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      estimated_cost: input.estimated_cost ?? null,
      status: input.status ?? "success",
      error_message: input.error_message ? input.error_message.slice(0, 500) : null,
    });

    if (error) {
      console.warn("[ai-usage] Usage log insert failed:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.warn("[ai-usage] Usage log failed:", safeErrorMessage(error));
    return { success: false };
  }
}
