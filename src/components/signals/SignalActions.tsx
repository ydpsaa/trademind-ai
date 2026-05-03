"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { archiveSignalAction, dismissSignalAction } from "@/app/signals/actions";
import type { SignalActionState } from "@/lib/signals/types";

const initialState: SignalActionState = {};

export function SignalStatusActions({ signalId, compact = false }: { signalId: string; compact?: boolean }) {
  const [dismissState, dismissFormAction, dismissPending] = useActionState(dismissSignalAction, initialState);
  const [archiveState, archiveFormAction, archivePending] = useActionState(archiveSignalAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (dismissState.success || archiveState.success) router.refresh();
  }, [archiveState.success, dismissState.success, router]);

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "text-xs" : "text-sm"}`}>
      <form action={dismissFormAction}>
        <input type="hidden" name="signal_id" value={signalId} />
        <button disabled={dismissPending} className="text-zinc-300 transition hover:text-white disabled:opacity-50">
          {dismissPending ? "Dismissing..." : "Dismiss"}
        </button>
      </form>
      <form action={archiveFormAction}>
        <input type="hidden" name="signal_id" value={signalId} />
        <button disabled={archivePending} className="text-zinc-300 transition hover:text-white disabled:opacity-50">
          {archivePending ? "Archiving..." : "Archive"}
        </button>
      </form>
      {dismissState.error ? <span className="text-xs text-rose-300">{dismissState.error}</span> : null}
      {archiveState.error ? <span className="text-xs text-rose-300">{archiveState.error}</span> : null}
    </div>
  );
}
