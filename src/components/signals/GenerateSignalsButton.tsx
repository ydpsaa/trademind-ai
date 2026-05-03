"use client";

import { useFormStatus } from "react-dom";
import { Zap } from "lucide-react";

export function GenerateSignalsButton() {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50">
      <Zap className="h-4 w-4" />
      {pending ? "Generating..." : "Generate Simulated Signals"}
    </button>
  );
}
