"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { deleteTradeAction, type TradeActionState } from "@/app/journal/actions";

interface DeleteTradeButtonProps {
  tradeId: string;
}

const initialState: TradeActionState = {};

export function DeleteTradeButton({ tradeId }: DeleteTradeButtonProps) {
  const [state, formAction, pending] = useActionState(deleteTradeAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!pending && !state.error && state.success) {
      router.refresh();
    }
  }, [pending, router, state.error, state.success]);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="trade_id" value={tradeId} />
      <button disabled={pending} className="text-rose-300 transition hover:text-rose-200 disabled:opacity-50">
        {pending ? "Deleting..." : "Delete"}
      </button>
      {state.error ? <span className="text-xs text-rose-300">{state.error}</span> : null}
    </form>
  );
}
