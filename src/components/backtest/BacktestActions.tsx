"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { deleteBacktestAction } from "@/app/backtest-lab/actions";
import type { BacktestFormState } from "@/lib/backtest/types";

const initialState: BacktestFormState = {};

export function DeleteBacktestButton({ backtestId }: { backtestId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction, pending] = useActionState(deleteBacktestAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  if (!confirmed) {
    return (
      <button type="button" onClick={() => setConfirmed(true)} className="text-rose-300 transition hover:text-rose-200">
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="backtest_id" value={backtestId} />
      <button disabled={pending} className="text-rose-200 transition hover:text-rose-100 disabled:opacity-50">
        {pending ? "Deleting..." : "Confirm delete"}
      </button>
      <button type="button" onClick={() => setConfirmed(false)} className="text-zinc-500 transition hover:text-zinc-300">
        Cancel
      </button>
      {state.error ? <span className="text-xs text-rose-300">{state.error}</span> : null}
    </form>
  );
}
