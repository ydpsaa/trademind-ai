import Link from "next/link";
import { Layers3, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateTemplatesButton, StrategyActionLinks } from "@/components/strategies/StrategyActions";
import { StrategyChipList, StrategyRuleBadges } from "@/components/strategies/StrategyRuleBadges";
import { defaultStrategyTemplates } from "@/lib/strategies/defaults";
import type { Strategy } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

interface StrategiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getStrategies() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { strategies: [], error: "Data service is not configured.", user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { strategies: [], error: "You must be signed in to view strategies.", user: null };

  const { data, error } = await supabase
    .from("strategies")
    .select("id,user_id,name,description,rules_json,is_active,created_at,updated_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) return { strategies: [], error: error.message, user: userData.user as User };
  return { strategies: (data ?? []) as Strategy[], error: null, user: userData.user as User };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function StrategiesPage({ searchParams }: StrategiesPageProps) {
  const params = await searchParams;
  const { strategies, error, user } = await getStrategies();
  const rules = strategies.map((strategy) => normalizeStrategyRules(strategy.rules_json));
  const activeCount = strategies.filter((strategy) => strategy.is_active).length;
  const avgRr = rules.length ? rules.reduce((sum, item) => sum + item.minimumRr, 0) / rules.length : 0;
  const strictNewsCount = rules.filter((item) => item.avoidHighImpactNews).length;

  return (
    <AppShell title="Strategies" subtitle="Build reusable trading rules for backtests, signals, and AI reviews." user={user}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Layers3 className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Strategy Builder</h2>
              <p className="mt-1 text-sm text-zinc-500">Rules are stored securely and ready for future Backtest Lab and Signals.</p>
            </div>
          </div>
          <Link href="/strategies/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/20">
            <Plus className="h-4 w-4" />
            New Strategy
          </Link>
        </div>

        {params.created ? <GlassCard className="border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Strategy created successfully.</GlassCard> : null}
        {params.updated ? <GlassCard className="border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Strategy updated successfully.</GlassCard> : null}
        {error ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</GlassCard> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Strategies" value={String(strategies.length)} />
          <SummaryCard label="Active Strategies" value={String(activeCount)} />
          <SummaryCard label="Average Minimum RR" value={avgRr ? avgRr.toFixed(2) : "0"} />
          <SummaryCard label="Strict News Filters" value={String(strictNewsCount)} />
        </div>

        {strategies.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {strategies.map((strategy) => {
              const ruleSet = normalizeStrategyRules(strategy.rules_json);
              return (
                <GlassCard key={strategy.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{strategy.name}</h2>
                        <StatusBadge tone={strategy.is_active ? "positive" : "neutral"}>{strategy.is_active ? "Active" : "Inactive"}</StatusBadge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{strategy.description || "No description."}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>Min RR <span className="text-white">{ruleSet.minimumRr}</span></div>
                      <div className="mt-1">Max Risk <span className="text-white">{ruleSet.maxRiskPercent}%</span></div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="mb-2 text-xs text-zinc-500">Markets</div>
                      <StrategyChipList items={ruleSet.markets} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-zinc-500">Symbols</div>
                      <StrategyChipList items={ruleSet.symbols} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-zinc-500">Sessions</div>
                      <StrategyChipList items={ruleSet.sessions} />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-xs text-zinc-500">Key Rules</div>
                    <StrategyRuleBadges rules={ruleSet} />
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <StatusBadge tone="neutral">{ruleSet.directionBias}</StatusBadge>
                    <StrategyActionLinks strategyId={strategy.id} isActive={Boolean(strategy.is_active)} />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <ShieldCheck className="h-5 w-5 text-zinc-300" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No strategies yet</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Create a strategy manually or seed the default ICT templates to start building reusable rules.</p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/strategies/new" className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white">
                  Create first strategy
                </Link>
                <CreateTemplatesButton />
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {defaultStrategyTemplates.map((template) => (
                <div key={template.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-semibold">{template.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{template.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
