import type { ReactNode } from "react";
import { Bell, CalendarDays, Menu, Sparkles } from "lucide-react";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  accountSelector?: ReactNode;
}

export function Topbar({ title = "Dashboard", subtitle = "Welcome back, Alex. Here's your trading overview.", accountSelector }: TopbarProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] p-3 lg:hidden">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-[0.16em]">TradeMind AI</span>
        </div>
        <Menu className="h-5 w-5 text-zinc-400" />
      </div>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[1.7rem]">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {accountSelector}
          <button className="inline-flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white shadow-inner shadow-white/5">
            May 12 - May 19 <CalendarDays className="h-4 w-4 text-zinc-400" />
          </button>
          <button className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06]" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>
    </>
  );
}
