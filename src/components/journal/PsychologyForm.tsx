"use client";

import Link from "next/link";
import { useActionState } from "react";
import { upsertTradePsychologyAction, type PsychologyActionState } from "@/app/journal/[tradeId]/psychology/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { emotionLabels } from "@/lib/psychology/emotions";
import { emotionValues, type TradePsychology } from "@/lib/psychology/types";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const textareaClass = "mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const initialState: PsychologyActionState = {};

export function PsychologyForm({ tradeId, psychology }: { tradeId: string; psychology: TradePsychology | null }) {
  const [state, formAction, pending] = useActionState(upsertTradePsychologyAction, initialState);

  return (
    <GlassCard className="p-4 md:p-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="trade_id" value={tradeId} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm">
            <span className="text-zinc-300">Emotion Before</span>
            <select name="emotion_before" className={fieldClass} defaultValue={psychology?.emotion_before ?? ""}>
              <option value="">Select emotion</option>
              {emotionValues.map((emotion) => (
                <option key={emotion} value={emotion}>{emotionLabels[emotion]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-300">Emotion After</span>
            <select name="emotion_after" className={fieldClass} defaultValue={psychology?.emotion_after ?? ""}>
              <option value="">Select emotion</option>
              {emotionValues.map((emotion) => (
                <option key={emotion} value={emotion}>{emotionLabels[emotion]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-300">Confidence</span>
            <input name="confidence_level" type="number" min="1" max="10" defaultValue={psychology?.confidence_level ?? ""} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-300">Stress</span>
            <input name="stress_level" type="number" min="1" max="10" defaultValue={psychology?.stress_level ?? ""} className={fieldClass} />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-300">FOMO</span>
            <input name="fomo_score" type="number" min="1" max="10" defaultValue={psychology?.fomo_score ?? ""} className={fieldClass} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-zinc-300">Discipline Note</span>
          <textarea name="discipline_note" defaultValue={psychology?.discipline_note ?? ""} className={textareaClass} />
        </label>

        {state.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link href={`/journal/${tradeId}`} className="grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
            Cancel
          </Link>
          <button disabled={pending} className="h-11 rounded-xl border border-white/10 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving..." : "Save Psychology"}
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
