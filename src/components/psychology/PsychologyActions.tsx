"use client";

import { useActionState } from "react";
import { detectRevengeEventsAction, recalculateDisciplineScoreAction } from "@/app/psychology/actions";
import type { DisciplinePeriodType } from "@/lib/discipline/types";

const initialState: { error?: string } = {};

export function PsychologyActions({ periodType }: { periodType: DisciplinePeriodType }) {
  const [scoreState, scoreAction, scorePending] = useActionState(recalculateDisciplineScoreAction, initialState);
  const [revengeState, revengeAction, revengePending] = useActionState(detectRevengeEventsAction, initialState);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={scoreAction}>
          <input type="hidden" name="period_type" value={periodType} />
          <button disabled={scorePending} className="h-10 rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60">
            {scorePending ? "Calculating..." : "Recalculate Discipline Score"}
          </button>
        </form>
        <form action={revengeAction}>
          <input type="hidden" name="period_type" value={periodType} />
          <button disabled={revengePending} className="h-10 rounded-xl border border-white/10 bg-white/[0.08] px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">
            {revengePending ? "Detecting..." : "Detect Revenge Patterns"}
          </button>
        </form>
      </div>
      {scoreState.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{scoreState.error}</div> : null}
      {revengeState.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{revengeState.error}</div> : null}
    </div>
  );
}
