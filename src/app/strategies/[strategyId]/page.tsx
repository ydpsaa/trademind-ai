import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Beaker, Bot, Radio, SquarePen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StrategyChipList, StrategyRuleBadges } from "@/components/strategies/StrategyRuleBadges";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Strategy } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";
import type { User } from "@supabase/supabase-js";

interface StrategyDetailPageProps {
  params: Promise<{ strategyId: string }>;
}

async function getStrategy(strategyId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("strategies")
    .select("id,user_id,name,description,rules_json,is_active,created_at,updated_at")
    .eq("id", strategyId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) return null;
  return { strategy: data as Strategy, user: userData.user as User };
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function FutureCard({ icon: Icon, title }: { icon: typeof Beaker; title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

export default async function StrategyDetailPage({ params }: StrategyDetailPageProps) {
  const { strategyId } = await params;
  const context = await getStrategy(strategyId);

  if (!context) {
    notFound();
  }

  const { strategy, user } = context;
  const rules = normalizeStrategyRules(strategy.rules_json);
  const boolLabel = (value: boolean) => (value ? "Required" : "Optional");

  return (
    <AppShell title={strategy.name} subtitle="Strategy rule detail." user={user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/strategies" className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
                <ArrowLeft className="h-4 w-4" />
                Back to Strategies
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{strategy.name}</h2>
                <StatusBadge tone={strategy.is_active ? "positive" : "neutral"}>{strategy.is_active ? "Active" : "Inactive"}</StatusBadge>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{strategy.description || "No description."}</p>
            </div>
            <Link href={`/strategies/${strategy.id}/edit`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white">
              <SquarePen className="h-4 w-4" />
              Edit
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Markets, Symbols & Sessions</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <div className="mb-2 text-xs text-zinc-500">Markets</div>
              <StrategyChipList items={rules.markets} />
            </div>
            <div>
              <div className="mb-2 text-xs text-zinc-500">Symbols</div>
              <StrategyChipList items={rules.symbols} />
            </div>
            <div>
              <div className="mb-2 text-xs text-zinc-500">Sessions</div>
              <StrategyChipList items={rules.sessions} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Smart Money / ICT Rules</h2>
          <div className="mt-4">
            <StrategyRuleBadges rules={rules} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RuleRow label="Direction Bias" value={rules.directionBias} />
            <RuleRow label="BOS" value={boolLabel(rules.requiresBos)} />
            <RuleRow label="CHoCH" value={boolLabel(rules.requiresChoch)} />
            <RuleRow label="Liquidity Sweep" value={boolLabel(rules.requiresLiquiditySweep)} />
            <RuleRow label="FVG" value={boolLabel(rules.requiresFvg)} />
            <RuleRow label="Order Block" value={boolLabel(rules.requiresOrderBlock)} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Risk & Execution Models</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RuleRow label="Minimum RR" value={String(rules.minimumRr)} />
            <RuleRow label="Max Risk %" value={`${rules.maxRiskPercent}%`} />
            <RuleRow label="Avoid High-Impact News" value={rules.avoidHighImpactNews ? "Yes" : "No"} />
            <RuleRow label="News Buffer" value={`${rules.newsBufferMinutes} min`} />
            <RuleRow label="Entry Model" value={rules.entryModel} />
            <RuleRow label="Stop Loss Model" value={rules.stopLossModel} />
            <RuleRow label="Take Profit Model" value={rules.takeProfitModel} />
          </div>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-3">
          <FutureCard icon={Beaker} title="Backtest Lab" />
          <FutureCard icon={Radio} title="Signals" />
          <FutureCard icon={Bot} title="AI Review Context" />
        </div>
      </div>
    </AppShell>
  );
}
