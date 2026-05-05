import { emotionValues, type TradeEmotion } from "@/lib/psychology/types";

export const emotionLabels: Record<TradeEmotion, string> = {
  neutral: "Neutral",
  confident: "Confident",
  fear: "Fear",
  greed: "Greed",
  fomo: "FOMO",
  revenge: "Revenge",
  tired: "Tired",
  anxious: "Anxious",
};

export const damagingEmotions = new Set<TradeEmotion>(["fear", "greed", "fomo", "revenge", "tired", "anxious"]);
export const stableEmotions = new Set<TradeEmotion>(["neutral", "confident"]);

export function normalizeEmotion(value: string | null | undefined): TradeEmotion | null {
  const normalized = value?.trim().toLowerCase();
  return emotionValues.includes(normalized as TradeEmotion) ? (normalized as TradeEmotion) : null;
}

export function formatEmotion(value: string | null | undefined) {
  const emotion = normalizeEmotion(value);
  return emotion ? emotionLabels[emotion] : "N/A";
}
