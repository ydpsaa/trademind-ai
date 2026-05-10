import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface AppShellProps {
  children: ReactNode;
  rightRail?: ReactNode;
  title?: string;
  subtitle?: string;
  user?: User | null;
  accountSelector?: ReactNode;
  mode?: "layout" | "page";
}

export function AppShell({ children, rightRail, title, subtitle, user, accountSelector, mode = "page" }: AppShellProps) {
  if (mode === "page") {
    if (rightRail) {
      return (
        <div className="grid min-w-0 gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_286px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">{children}</div>
          {rightRail}
        </div>
      );
    }

    return <>{children}</>;
  }

  const displayName = user?.user_metadata?.full_name || user?.email || "Trader";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(255,255,255,.13),transparent_28%),radial-gradient(circle_at_0%_58%,rgba(255,255,255,.055),transparent_32%),linear-gradient(180deg,#050505,#000)]" />
      <div className="relative grid min-h-screen w-full gap-3.5 p-3.5 lg:grid-cols-[210px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)] 2xl:gap-4 2xl:p-4">
        <Sidebar userEmail={user?.email ?? null} userName={displayName} />
        <div className="min-w-0">
          <Topbar title={title} subtitle={subtitle} accountSelector={accountSelector} />
          <div className="mt-4 min-w-0 transition-opacity duration-150">{children}</div>
        </div>
      </div>
    </main>
  );
}
