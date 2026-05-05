"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Brain,
  CalendarDays,
  ChevronRight,
  Home,
  LineChart,
  ListChecks,
  ScanLine,
  Settings,
  Sparkles,
  SquarePen,
  Unplug,
  WandSparkles,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Journal", href: "/journal", icon: SquarePen },
  { label: "AI Analysis", href: "/ai-analysis", icon: Bot },
  { label: "Market Scanner", href: "/market-scanner", icon: ScanLine },
  { label: "Backtest Lab", href: "/backtest-lab", icon: LineChart },
  { label: "Strategies", href: "/strategies", icon: WandSparkles },
  { label: "Signals", href: "/signals", icon: Activity },
  { label: "Psychology", href: "/psychology", icon: Brain },
  { label: "Rules", href: "/rules", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Connections", href: "/connections", icon: Unplug },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  userEmail?: string | null;
  userName?: string | null;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();
  const initials = (userName || userEmail || "User")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="glass-panel sticky top-4 hidden max-h-[calc(100vh-2rem)] rounded-3xl p-3 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={1.7} />
        <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white">TradeMind AI</div>
      </Link>
      <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/dashboard" && pathname === "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition ${
                active ? "bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)]" : "text-zinc-400 hover:bg-white/7 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-semibold">{initials || "U"}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{userName || userEmail || "Trader"}</div>
            <div className="truncate text-xs text-zinc-500">{userEmail ? "Free Plan" : "Not signed in"}</div>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white" aria-label="Log out">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
