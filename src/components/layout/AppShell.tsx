import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUser } from "@/lib/supabase/server";

interface AppShellProps {
  children: ReactNode;
  rightRail?: ReactNode;
  title?: string;
  subtitle?: string;
}

export async function AppShell({ children, rightRail, title, subtitle }: AppShellProps) {
  const user = await getCurrentUser();
  const displayName = user?.user_metadata?.full_name || user?.email || "Alex Trader";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(255,255,255,.18),transparent_28%),radial-gradient(circle_at_0%_58%,rgba(255,255,255,.08),transparent_32%),linear-gradient(180deg,#050505,#000)]" />
      <div className="relative grid min-h-screen w-full gap-3.5 p-3.5 lg:grid-cols-[210px_minmax(0,1fr)] min-[1400px]:grid-cols-[210px_minmax(0,1fr)_286px] 2xl:grid-cols-[220px_minmax(0,1fr)_300px] 2xl:gap-4 2xl:p-4">
        <Sidebar userEmail={user?.email ?? null} userName={displayName} />
        <div className="min-w-0">
          <Topbar title={title} subtitle={subtitle} />
          <div className="mt-4 min-w-0">{children}</div>
        </div>
        {rightRail}
      </div>
    </main>
  );
}
