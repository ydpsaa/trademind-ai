import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface UserUsageSnapshot {
  period_start: string;
  period_end: string;
  trades_count: number;
  ai_reviews_count: number;
  ocr_count: number;
}

export function getCurrentUsagePeriod(date = new Date()) {
  const periodStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

function emptyUsage(periodStart: string, periodEnd: string): UserUsageSnapshot {
  return {
    period_start: periodStart,
    period_end: periodEnd,
    trades_count: 0,
    ai_reviews_count: 0,
    ocr_count: 0,
  };
}

export async function getUserUsage(userId: string): Promise<UserUsageSnapshot> {
  const { periodStart, periodEnd } = getCurrentUsagePeriod();

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return emptyUsage(periodStart, periodEnd);

    const { data, error } = await supabase
      .from("user_usage")
      .select("period_start, period_end, trades_count, ai_reviews_count, ocr_count")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();

    if (error) {
      console.warn("[user-usage] Usage read failed:", error.message);
      return emptyUsage(periodStart, periodEnd);
    }

    if (!data) return emptyUsage(periodStart, periodEnd);

    return {
      period_start: data.period_start,
      period_end: data.period_end,
      trades_count: Number(data.trades_count) || 0,
      ai_reviews_count: Number(data.ai_reviews_count) || 0,
      ocr_count: Number(data.ocr_count) || 0,
    };
  } catch (error) {
    console.warn("[user-usage] Usage read failed:", error instanceof Error ? error.message : "Unknown usage error");
    return emptyUsage(periodStart, periodEnd);
  }
}

export async function incrementAIReviewUsage(userId: string) {
  const { periodStart, periodEnd } = getCurrentUsagePeriod();

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { success: false };

    const { data, error: readError } = await supabase
      .from("user_usage")
      .select("id, ai_reviews_count")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();

    if (readError) {
      console.warn("[user-usage] Usage counter read failed:", readError.message);
      return { success: false };
    }

    if (data?.id) {
      const { error } = await supabase
        .from("user_usage")
        .update({
          ai_reviews_count: (Number(data.ai_reviews_count) || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("user_id", userId);

      if (error) {
        console.warn("[user-usage] Usage counter update failed:", error.message);
        return { success: false };
      }

      return { success: true };
    }

    const { error } = await supabase.from("user_usage").insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      ai_reviews_count: 1,
    });

    if (error) {
      console.warn("[user-usage] Usage counter insert failed:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.warn("[user-usage] Usage counter failed:", error instanceof Error ? error.message : "Unknown usage error");
    return { success: false };
  }
}
