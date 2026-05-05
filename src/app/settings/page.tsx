import Link from "next/link";
import { Brain, CreditCard, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserUsage } from "@/lib/usage/user-usage";

const settingsSections = ["Profile", "Risk Settings", "Theme", "Account Preferences"];

function formatPlan(plan: string | null | undefined) {
  if (!plan) return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = userData.user;

  let profile: { email: string | null; full_name: string | null; plan: string | null } | null = null;
  let usage = null;
  let psychologyActive = false;
  let latestDisciplineScore: number | null = null;
  let revengeEventsThisMonth = 0;
  let activeRulesCount = 0;

  if (user && supabase) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [profileResult, userUsage, psychologyResult, disciplineResult, revengeResult, rulesResult] = await Promise.all([
      supabase.from("profiles").select("email, full_name, plan").eq("id", user.id).maybeSingle(),
      getUserUsage(user.id),
      supabase.from("trade_psychology").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("discipline_scores").select("total_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("revenge_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", monthStart.toISOString()),
      supabase.from("trading_rules").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("active", true),
    ]);
    profile = profileResult.data;
    usage = userUsage;
    psychologyActive = !psychologyResult.error;
    latestDisciplineScore = disciplineResult.data?.total_score != null ? Math.round(Number(disciplineResult.data.total_score)) : null;
    revengeEventsThisMonth = revengeResult.count ?? 0;
    activeRulesCount = rulesResult.count ?? 0;
  }

  return (
    <AppShell title="Settings" subtitle="Workspace preferences, plan visibility, and future account controls." user={user}>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <UserRound className="h-4 w-4 text-zinc-400" />
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <StatusBadge tone="neutral">Authenticated</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-500">Name</div>
                <div className="mt-1 truncate text-white">{profile?.full_name || user?.email || "Signed-in user"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-500">Email</div>
                <div className="mt-1 truncate text-white">{profile?.email || user?.email || "Not available"}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              <h2 className="text-lg font-semibold text-white">Plan & Usage</h2>
              <StatusBadge tone="neutral">{formatPlan(profile?.plan)} Plan</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <span className="text-zinc-400">AI reviews this month</span>
                <span className="font-semibold text-white">{usage?.ai_reviews_count ?? 0}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-400">
                Usage limits and billing will be enabled later. Current tracking is for product observability and cost control preparation.
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Brain className="h-4 w-4 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">Psychology Module</h2>
            <StatusBadge tone={psychologyActive ? "positive" : "neutral"}>{psychologyActive ? "Active" : "Not available"}</StatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Psychology tracking helps calculate Discipline Score and behavioral patterns. It is focused on trading behavior and does not provide medical diagnosis.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-zinc-500">Latest Discipline Score</div>
              <div className="mt-1 text-lg font-semibold text-white">{latestDisciplineScore ?? "Not calculated"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-zinc-500">Revenge Events This Month</div>
              <div className="mt-1 text-lg font-semibold text-white">{revengeEventsThisMonth}</div>
            </div>
            <Link href="/psychology" className="grid min-h-16 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white">
              Open Psychology
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Trading Rules</h2>
            <StatusBadge tone={activeRulesCount ? "positive" : "neutral"}>{activeRulesCount ? "Active" : "Not configured"}</StatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Trading rules power the pre-trade checklist, Discipline Score rule adherence, and AI Review context.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-zinc-500">Active Rules</div>
              <div className="mt-1 text-lg font-semibold text-white">{activeRulesCount}</div>
            </div>
            <Link href="/rules" className="grid min-h-16 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white">
              Open Rules
            </Link>
          </div>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => (
            <GlassCard key={section} className="p-4">
              <h2 className="text-base font-semibold">{section}</h2>
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                    <span className="text-zinc-400">{section} option {item}</span>
                    <span className="text-xs text-zinc-500">Mock</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
