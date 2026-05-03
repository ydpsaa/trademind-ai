"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function BacktestSubmitButton({ disabled, icon }: { disabled: boolean; icon: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || disabled} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50">
      {icon}
      {pending ? "Running simulation..." : "Run Backtest"}
    </button>
  );
}
