"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createStrategyTemplatesAction, deleteStrategyAction, toggleStrategyActiveAction } from "@/app/strategies/actions";
import type { StrategyFormState } from "@/lib/strategies/types";

const initialState: StrategyFormState = {};

export function ToggleStrategyButton({ strategyId, isActive }: { strategyId: string; isActive: boolean }) {
  const [state, formAction, pending] = useActionState(toggleStrategyActiveAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="strategy_id" value={strategyId} />
      <input type="hidden" name="next_active" value={String(!isActive)} />
      <button disabled={pending} className="text-zinc-300 transition hover:text-white disabled:opacity-50">
        {pending ? "Updating..." : isActive ? "Deactivate" : "Activate"}
      </button>
      {state.error ? <span className="text-xs text-rose-300">{state.error}</span> : null}
    </form>
  );
}

export function DeleteStrategyButton({ strategyId }: { strategyId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction, pending] = useActionState(deleteStrategyAction, initialState);
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
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="strategy_id" value={strategyId} />
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

export function CreateTemplatesButton() {
  const [state, formAction, pending] = useActionState(createStrategyTemplatesAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="inline-flex flex-col gap-2 sm:flex-row sm:items-center">
      <button disabled={pending} className="h-10 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50">
        {pending ? "Creating..." : "Create ICT Templates"}
      </button>
      {state.error ? <span className="text-sm text-rose-300">{state.error}</span> : null}
    </form>
  );
}

export function StrategyActionLinks({ strategyId, isActive }: { strategyId: string; isActive: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link href={`/strategies/${strategyId}`} className="text-zinc-300 transition hover:text-white">
        View
      </Link>
      <Link href={`/strategies/${strategyId}/edit`} className="text-zinc-300 transition hover:text-white">
        Edit
      </Link>
      <ToggleStrategyButton strategyId={strategyId} isActive={isActive} />
      <DeleteStrategyButton strategyId={strategyId} />
    </div>
  );
}
