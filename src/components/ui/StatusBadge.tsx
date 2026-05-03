import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: "positive" | "negative" | "warning" | "neutral";
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const tones = {
    positive: "bg-emerald-400/10 text-emerald-300",
    negative: "bg-rose-400/10 text-rose-300",
    warning: "bg-amber-300/10 text-amber-200",
    neutral: "bg-white/10 text-zinc-300",
  };

  return <span className={`w-fit rounded-md px-2 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}
