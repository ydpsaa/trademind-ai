"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateTradeReviewAction, type ReviewActionState } from "@/app/journal/[tradeId]/actions";

const initialState: ReviewActionState = {};

interface GenerateAIReviewButtonProps {
  tradeId: string;
  label: string;
}

export function GenerateAIReviewButton({ tradeId, label }: GenerateAIReviewButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(generateTradeReviewAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="trade_id" value={tradeId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {pending ? "Generating..." : label}
      </button>
      {state.error ? <p className="max-w-md text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-300">Review generated.</p> : null}
    </form>
  );
}
