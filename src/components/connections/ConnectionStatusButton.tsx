"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { checkConnectionStatusAction } from "@/app/connections/actions";
import type { ConnectionActionState, IntegrationProvider } from "@/lib/connections/types";

const initialState: ConnectionActionState = {};

export function ConnectionStatusButton({ provider, label = "Test Status" }: { provider: IntegrationProvider; label?: string }) {
  const [state, formAction, pending] = useActionState(checkConnectionStatusAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="provider" value={provider} />
      <button
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Checking..." : label}
      </button>
      {state.error ? <span className="text-xs leading-5 text-rose-300">{state.error}</span> : null}
      {state.success ? <span className="text-xs leading-5 text-emerald-300">Status checked safely.</span> : null}
    </form>
  );
}
