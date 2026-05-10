"use client";

import type { ReactNode } from "react";
import { Bell, CalendarDays, Menu, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  accountSelector?: ReactNode;
}

const pageChrome: Array<{ test: (pathname: string) => boolean; title: string; subtitle: string }> = [
  { test: (pathname) => pathname === "/" || pathname.startsWith("/dashboard"), title: "Dashboard", subtitle: "Your real trading data, readiness, and review loop." },
  { test: (pathname) => pathname === "/journal", title: "Journal", subtitle: "Track your trades, performance, and execution quality." },
  { test: (pathname) => pathname === "/journal/new", title: "Add Trade", subtitle: "Save a manual journal trade to your Supabase workspace." },
  { test: (pathname) => pathname.startsWith("/journal/"), title: "Trade Detail", subtitle: "Review trade context, checklist, psychology, news, and AI feedback." },
  { test: (pathname) => pathname.startsWith("/ai-analysis"), title: "AI Trade Analysis", subtitle: "AI trading coach reviews generated from your journal data." },
  { test: (pathname) => pathname.startsWith("/psychology"), title: "Psychology", subtitle: "Track emotions, discipline, and behavioral patterns behind your trades." },
  { test: (pathname) => pathname === "/rules", title: "Trading Rules", subtitle: "Build your pre-trade checklist and track rule discipline over time." },
  { test: (pathname) => pathname.startsWith("/rules/new"), title: "Create Rule", subtitle: "Add a manual or automatic pre-trade checklist rule." },
  { test: (pathname) => pathname.startsWith("/rules/"), title: "Edit Rule", subtitle: "Update pre-trade checklist logic." },
  { test: (pathname) => pathname.startsWith("/strategies/new"), title: "New Strategy", subtitle: "Define reusable rules for future backtests, signals, and AI context." },
  { test: (pathname) => pathname.startsWith("/strategies/") && pathname.endsWith("/edit"), title: "Edit Strategy", subtitle: "Update the rules and risk constraints for this playbook." },
  { test: (pathname) => pathname.startsWith("/strategies/"), title: "Strategy Detail", subtitle: "Strategy rule detail." },
  { test: (pathname) => pathname.startsWith("/strategies"), title: "Strategies", subtitle: "Build reusable trading rules for backtests, signals, and AI reviews." },
  { test: (pathname) => pathname.startsWith("/calendar"), title: "Economic Calendar", subtitle: "Track high-impact macro events that may affect Forex, Gold, Crypto and Indices." },
  { test: (pathname) => pathname.startsWith("/backtest-lab/"), title: "Backtest Detail", subtitle: "Saved backtest report." },
  { test: (pathname) => pathname.startsWith("/backtest-lab"), title: "Backtest Lab", subtitle: "Test strategy logic before using it for signals or automation." },
  { test: (pathname) => pathname.startsWith("/market-scanner"), title: "Market Scanner", subtitle: "Market structure will activate after Market Data Feed integration." },
  { test: (pathname) => pathname.startsWith("/signals/"), title: "Signal Detail", subtitle: "Signal report." },
  { test: (pathname) => pathname.startsWith("/signals"), title: "Signals", subtitle: "Review setup ideas after Market Data Feed and Strategy validation are connected." },
  { test: (pathname) => pathname.startsWith("/connections/"), title: "Connections", subtitle: "Trading integrations and setup guidance." },
  { test: (pathname) => pathname.startsWith("/connections"), title: "Connections", subtitle: "Connect exchange, broker, charting, and market data tools for your trading workspace." },
  { test: (pathname) => pathname.startsWith("/system-status"), title: "System Status", subtitle: "Admin-only platform diagnostics." },
  { test: (pathname) => pathname.startsWith("/settings"), title: "Settings", subtitle: "Workspace preferences, plan visibility, and future account controls." },
];

function getPageChrome(pathname: string) {
  return pageChrome.find((item) => item.test(pathname)) ?? pageChrome[0];
}

export function Topbar({ title, subtitle, accountSelector }: TopbarProps) {
  const pathname = usePathname();
  const fallback = getPageChrome(pathname);
  const displayTitle = title ?? fallback.title;
  const displaySubtitle = subtitle ?? fallback.subtitle;

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
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[1.7rem]">{displayTitle}</h1>
          <p className="mt-1 text-sm text-zinc-400">{displaySubtitle}</p>
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
