import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, eyebrow, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[1.7rem]">{title}</h1>
        {eyebrow ? <p className="mt-1 text-sm text-zinc-400">{eyebrow}</p> : null}
      </div>
      {action}
    </div>
  );
}
