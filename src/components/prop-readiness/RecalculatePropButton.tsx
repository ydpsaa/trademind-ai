"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { recalculatePropReadinessAction } from "@/app/prop-readiness/actions";
import type { PropProfileFormState } from "@/lib/prop-readiness/types";

const initialState: PropProfileFormState = {};

export function RecalculatePropButton({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(recalculatePropReadinessAction, initialState);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Calculating..." : "Recalculate"}
      </button>
      {state.error ? <span className="max-w-sm text-right text-xs text-rose-300">{state.error}</span> : null}
    </form>
  );
}
