import Link from "next/link";
import { CheckCircle2, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { createDefaultTradingRulesAction, deleteTradingRuleAction, toggleTradingRuleAction } from "@/app/rules/actions";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateRuleStats } from "@/lib/rules/stats";
import type { TradeRuleCheckWithRule, TradingRule } from "@/lib/rules/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatRuleType(type: string) {
  return type === "auto_check" ? "Auto" : "Manual";
}

async function getRulesContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rules: [], checks: [], error: "Supabase is not configured.", user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { rules: [], checks: [], error: "You must be signed in.", user: null };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [rulesResult, checksResult] = await Promise.all([
    supabase.from("trading_rules").select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    supabase.from("trade_rule_checks").select("id,user_id,trade_id,rule_id,passed,violation_reason,created_at,trading_rules(id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at)").eq("user_id", userData.user.id).gte("created_at", monthStart.toISOString()).limit(200),
  ]);

  return {
    rules: (rulesResult.data ?? []) as TradingRule[],
    checks: (checksResult.data ?? []) as unknown as TradeRuleCheckWithRule[],
    error: rulesResult.error?.message ?? checksResult.error?.message ?? null,
    user: userData.user as User,
  };
}

export default async function RulesPage() {
  const { rules, checks, error, user } = await getRulesContext();
  const stats = calculateRuleStats(rules, checks);

  return (
    <AppShell title="Trading Rules" subtitle="Build your pre-trade checklist and track rule discipline over time." user={user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ListChecks className="h-5 w-5 text-zinc-300" />
                <h2 className="text-xl font-semibold text-white">Pre-Trade Checklist</h2>
                <StatusBadge tone="neutral">Rules Engine</StatusBadge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Rules are checked before journal entries and feed Discipline Score and AI Review context.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={createDefaultTradingRulesAction}>
                <button className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white">Add Default Rules</button>
              </form>
              <Link href="/rules/new" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Create Rule
              </Link>
            </div>
          </div>
        </GlassCard>

        {error ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</GlassCard> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Active Rules", stats.totalActiveRules],
            ["Rule Adherence", `${Math.round(stats.ruleAdherence)}%`],
            ["Top Violated Rule", stats.topViolatedRule],
            ["Checks This Month", stats.totalRuleChecks],
          ].map(([label, value]) => (
            <GlassCard key={label} className="p-4">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className="mt-2 truncate text-2xl font-semibold text-white">{value}</div>
            </GlassCard>
          ))}
        </div>

        {rules.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rules.map((rule) => (
              <GlassCard key={rule.id} className="p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-zinc-500" />
                      <StatusBadge tone={rule.type === "auto_check" ? "warning" : "neutral"}>{formatRuleType(rule.type)}</StatusBadge>
                      <StatusBadge tone={rule.active ? "positive" : "neutral"}>{rule.active ? "Active" : "Inactive"}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-white">{rule.text}</h2>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                      <span>Violations: {rule.violation_count ?? 0}</span>
                      <span>Streak: {rule.streak_days ?? 0}</span>
                      <span>{formatDate(rule.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/rules/${rule.id}/edit`} className="grid h-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs text-zinc-300">Edit</Link>
                    <form action={toggleTradingRuleAction}>
                      <input type="hidden" name="rule_id" value={rule.id} />
                      <input type="hidden" name="active" value={String(!rule.active)} />
                      <button className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs text-zinc-300">{rule.active ? "Deactivate" : "Activate"}</button>
                    </form>
                    <form action={deleteTradingRuleAction}>
                      <input type="hidden" name="rule_id" value={rule.id} />
                      <button className="h-9 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 text-xs text-rose-200">Delete</button>
                    </form>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-zinc-500" />
            <h2 className="mt-3 text-lg font-semibold text-white">Create your first trading rule.</h2>
            <p className="mt-2 text-sm text-zinc-400">Your checklist will appear on manual trade creation and feed discipline analytics.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/rules/new" className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/15 px-4 text-sm font-semibold text-white">Create Rule</Link>
              <form action={createDefaultTradingRulesAction}>
                <button className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white">Add Default Rules</button>
              </form>
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
