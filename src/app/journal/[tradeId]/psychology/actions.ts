"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTradeEmotion } from "@/lib/psychology/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PsychologyActionState {
  error?: string;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalLevel(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
    throw new Error(`${label} must be between 1 and 10.`);
  }
  return parsed;
}

export async function upsertTradePsychologyAction(_state: PsychologyActionState, formData: FormData): Promise<PsychologyActionState> {
  try {
    const tradeId = optionalString(formData, "trade_id");
    if (!tradeId) return { error: "Missing trade id." };

    const supabase = await createSupabaseServerClient();
    if (!supabase) return { error: "Supabase is not configured." };

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { error: "You must be signed in." };

    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select("id")
      .eq("id", tradeId)
      .eq("user_id", userData.user.id)
      .single();

    if (tradeError || !trade) return { error: "Trade not found." };

    const emotionBefore = optionalString(formData, "emotion_before");
    const emotionAfter = optionalString(formData, "emotion_after");

    if (emotionBefore && !isTradeEmotion(emotionBefore)) return { error: "Emotion before must be a supported emotion." };
    if (emotionAfter && !isTradeEmotion(emotionAfter)) return { error: "Emotion after must be a supported emotion." };

    const payload = {
      user_id: userData.user.id,
      trade_id: tradeId,
      emotion_before: emotionBefore,
      emotion_after: emotionAfter,
      confidence_level: optionalLevel(formData, "confidence_level", "Confidence level"),
      stress_level: optionalLevel(formData, "stress_level", "Stress level"),
      fomo_score: optionalLevel(formData, "fomo_score", "FOMO score"),
      discipline_note: optionalString(formData, "discipline_note"),
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("trade_psychology")
      .select("id")
      .eq("trade_id", tradeId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (existingError) return { error: formatSupabaseError(existingError.message) };

    const { error } = existing?.id
      ? await supabase.from("trade_psychology").update(payload).eq("id", existing.id).eq("user_id", userData.user.id)
      : await supabase.from("trade_psychology").insert(payload);

    if (error) return { error: formatSupabaseError(error.message) };

    revalidatePath(`/journal/${tradeId}`);
    revalidatePath("/psychology");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save psychology data." };
  }

  redirect(`/journal/${formData.get("trade_id")}`);
}
