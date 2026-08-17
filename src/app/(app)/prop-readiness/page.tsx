import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PropProfileForm } from "@/components/prop-readiness/PropProfileForm";
import { RecalculatePropButton } from "@/components/prop-readiness/RecalculatePropButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TradingAccount } from "@/lib/accounts/types";
import type { PropReadinessProfile, PropReadinessSnapshot, PropRuleViolation } from "@/lib/prop-readiness/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PropReadinessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function tone(status: PropReadinessSnapshot["readiness_status"]) {
  if (status === "ready") return "positive";
  if (status === "blocked") return "negative";
  if (status === "caution" || status === "high_risk") return "warning";
  return "neutral";
}

function label(status: PropReadinessSnapshot["readiness_status"]) {
  if (status === "not_enough_data") return "Not enough data";
  if (status === "high_risk") return "High risk";
  return status.replace("_", " ");
}

function currency(value: number | null | undefined, code: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs uppercase tracking-[0.12em] text-zinc-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{detail}</div>
    </GlassCard>
  );
}

function ProgressRow({ label: rowLabel, value, detail }: { label: string; value: number; detail: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{rowLabel}</span>
        <span className="text-zinc-500">{detail}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-white/60" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function PropReadinessPage({ searchParams }: PropReadinessPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <AppShell title="Prop Readiness"><GlassCard className="p-4 text-sm text-rose-200">Data service is not configured.</GlassCard></AppShell>;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return <AppShell title="Prop Readiness"><GlassCard className="p-4 text-sm text-rose-200">You must be signed in.</GlassCard></AppShell>;

  const [accountsResult, profilesResult] = await Promise.all([
    supabase.from("trading_accounts").select("id,user_id,provider,account_name,account_type,currency,status,metadata,external_account_id,last_synced_at,created_at,updated_at").eq("user_id", userData.user.id).eq("status", "active").order("created_at", { ascending: true }),
    supabase.from("prop_readiness_profiles").select("id,user_id,trading_account_id,account_scope,name,initial_balance,profit_target_percent,max_daily_loss_percent,max_total_drawdown_percent,drawdown_type,minimum_trading_days,max_risk_per_trade_percent,consistency_rule_percent,timezone,trading_day_start_time,status,started_at,created_at,updated_at").eq("user_id", userData.user.id).order("updated_at", { ascending: false }),
  ]);
  const accounts = (accountsResult.data ?? []) as TradingAccount[];
  const profiles = (profilesResult.data ?? []) as PropReadinessProfile[];
  const requestedProfileId = firstValue(params.profile);
  const newMode = firstValue(params.new) === "1";
  const selectedProfile = newMode ? null : profiles.find((profile) => profile.id === requestedProfileId) ?? profiles.find((profile) => profile.status === "active") ?? profiles[0] ?? null;

  const [snapshotsResult, violationsResult] = selectedProfile
    ? await Promise.all([
        supabase.from("prop_readiness_snapshots").select("id,user_id,profile_id,trading_account_id,snapshot_at,current_balance,current_equity,peak_balance,total_pnl,today_pnl,profit_target_progress,daily_loss_used_percent,daily_loss_remaining,drawdown_used_percent,drawdown_remaining,trading_days_count,consistency_score,discipline_score,revenge_risk,readiness_score,readiness_status,data_quality,summary,warnings,recommendations,created_at").eq("user_id", userData.user.id).eq("profile_id", selectedProfile.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("prop_rule_violations").select("id,user_id,profile_id,trading_account_id,trade_id,violation_key,violation_type,severity,limit_value,actual_value,message,occurred_at,created_at").eq("user_id", userData.user.id).eq("profile_id", selectedProfile.id).order("occurred_at", { ascending: false }).limit(30),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const snapshots = (snapshotsResult.data ?? []) as PropReadinessSnapshot[];
  const violations = (violationsResult.data ?? []) as PropRuleViolation[];
  const latest = snapshots[0] ?? null;
  const account = selectedProfile?.trading_account_id ? accounts.find((item) => item.id === selectedProfile.trading_account_id) : null;
  const currencyCode = account?.currency || "USD";

  return (
    <AppShell title="Prop Readiness" subtitle="Track evaluation limits from real closed-trade journal data." user={userData.user}>
      <div className="min-w-0 space-y-4">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3"><Gauge className="h-5 w-5 text-zinc-400" /><h1 className="text-2xl font-semibold">Prop Readiness</h1><StatusBadge>Estimated from Journal</StatusBadge></div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Configure evaluation rules, link an account, and monitor daily loss, drawdown, targets, and violations. Always reconcile with the provider dashboard.</p>
          </div>
          <Link href="/prop-readiness?new=1" className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white">New Prop Profile</Link>
        </header>

        {profiles.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {profiles.map((profile) => (
              <Link key={profile.id} href={`/prop-readiness?profile=${profile.id}`} className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${selectedProfile?.id === profile.id ? "border-white/20 bg-white/12 text-white" : "border-white/10 bg-black/20 text-zinc-500 hover:text-white"}`}>
                {profile.name} · {profile.account_scope === "manual" ? "Manual Journal" : accounts.find((item) => item.id === profile.trading_account_id)?.account_name || "Linked account"}
              </Link>
            ))}
          </div>
        ) : null}

        {!selectedProfile || newMode ? (
          <GlassCard className="p-5 md:p-6">
            <div className="mb-5"><h2 className="text-lg font-semibold">{newMode ? "New Prop Profile" : "Create your Prop Profile"}</h2><p className="mt-1 text-sm text-zinc-500">Review every starter value and replace it with the exact rules from your evaluation account.</p></div>
            <PropProfileForm accounts={accounts} profile={null} />
          </GlassCard>
        ) : (
          <>
            <GlassCard className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">{selectedProfile.name}</h2><StatusBadge tone={latest ? tone(latest.readiness_status) : "neutral"}>{latest ? label(latest.readiness_status) : "Not calculated"}</StatusBadge><StatusBadge>{selectedProfile.account_scope === "manual" ? "Manual Journal" : account?.account_name || "Linked account"}</StatusBadge></div>
                  <p className="mt-2 text-sm text-zinc-500">{selectedProfile.drawdown_type === "trailing" ? "Trailing" : "Static"} drawdown · {selectedProfile.timezone} · day starts {selectedProfile.trading_day_start_time.slice(0, 5)}</p>
                </div>
                <RecalculatePropButton profileId={selectedProfile.id} />
              </div>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-amber-200/80">Closed-trade estimate only. Open PnL, intraday equity, commissions not recorded in PnL, and provider-specific resets may change the official result.</div>
            </GlassCard>

            {latest ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <Metric title="Readiness" value={latest.readiness_score === null ? "N/A" : `${Math.round(latest.readiness_score)}/100`} detail={label(latest.readiness_status)} />
                  <Metric title="Balance" value={currency(latest.current_balance, currencyCode)} detail="Closed-trade estimate" />
                  <Metric title="Daily remaining" value={currency(latest.daily_loss_remaining, currencyCode)} detail={`${Math.round(latest.daily_loss_used_percent)}% used`} />
                  <Metric title="Drawdown remaining" value={currency(latest.drawdown_remaining, currencyCode)} detail={`${Math.round(latest.drawdown_used_percent)}% used`} />
                  <Metric title="Target" value={`${Math.round(latest.profit_target_progress)}%`} detail={`${currency(latest.total_pnl, currencyCode)} PnL`} />
                  <Metric title="Trading days" value={String(latest.trading_days_count)} detail={`${selectedProfile.minimum_trading_days} required`} />
                </div>

                <div className="grid gap-4 xl:grid-cols-12">
                  <GlassCard className="p-5 xl:col-span-7">
                    <h2 className="text-base font-semibold">Limit Usage</h2>
                    <div className="mt-5 space-y-5">
                      <ProgressRow label="Daily loss limit" value={latest.daily_loss_used_percent} detail={`${Math.round(latest.daily_loss_used_percent)}% used`} />
                      <ProgressRow label="Maximum drawdown" value={latest.drawdown_used_percent} detail={`${Math.round(latest.drawdown_used_percent)}% used`} />
                      <ProgressRow label="Profit target" value={latest.profit_target_progress} detail={`${Math.round(latest.profit_target_progress)}% complete`} />
                    </div>
                    <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-400">{latest.summary}</p>
                  </GlassCard>
                  <GlassCard className="p-5 xl:col-span-5">
                    <h2 className="text-base font-semibold">Next Review</h2>
                    <div className="mt-4 space-y-3">
                      {(latest.warnings.length ? latest.warnings : ["No active estimated warning from closed-trade data."]).map((warning) => <div key={warning} className="flex gap-3 text-sm leading-6 text-zinc-400"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-200" />{warning}</div>)}
                      {latest.recommendations.slice(0, 2).map((recommendation) => <div key={recommendation} className="flex gap-3 text-sm leading-6 text-zinc-400"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />{recommendation}</div>)}
                    </div>
                  </GlassCard>
                </div>
              </>
            ) : (
              <GlassCard className="p-6 text-center"><ShieldAlert className="mx-auto h-7 w-7 text-zinc-600" /><h2 className="mt-3 text-base font-semibold">No readiness snapshot yet</h2><p className="mt-2 text-sm text-zinc-500">Run the first calculation to evaluate real closed trades linked to this profile.</p></GlassCard>
            )}

            <div className="grid gap-4 xl:grid-cols-12">
              <GlassCard className="p-5 xl:col-span-7">
                <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Violations</h2><span className="text-xs text-zinc-600">{violations.length} recorded</span></div>
                <div className="mt-4 divide-y divide-white/10">
                  {violations.length ? violations.map((violation) => (
                    <div key={violation.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      {violation.severity === "breach" ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />}
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-white">{violation.violation_type.replaceAll("_", " ")}</span><StatusBadge tone={violation.severity === "breach" ? "negative" : "warning"}>{violation.severity}</StatusBadge></div><p className="mt-1 text-sm leading-6 text-zinc-500">{violation.message}</p></div>
                      {violation.trade_id ? <Link href={`/journal/${violation.trade_id}`} className="text-xs text-zinc-500 hover:text-white">Trade</Link> : null}
                    </div>
                  )) : <div className="py-6 text-sm text-zinc-500">No Prop Profile violations recorded.</div>}
                </div>
              </GlassCard>
              <GlassCard className="p-5 xl:col-span-5">
                <h2 className="text-base font-semibold">Snapshot History</h2>
                <div className="mt-4 divide-y divide-white/10">
                  {snapshots.length ? snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {snapshot.readiness_status === "ready" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Gauge className="h-4 w-4 text-zinc-500" />}
                      <div className="min-w-0 flex-1"><div className="text-sm text-white">{new Date(snapshot.created_at).toLocaleString()}</div><div className="mt-1 text-xs text-zinc-600">Balance {currency(snapshot.current_balance, currencyCode)} · target {Math.round(snapshot.profit_target_progress)}%</div></div>
                      <StatusBadge tone={tone(snapshot.readiness_status)}>{snapshot.readiness_score === null ? "N/A" : Math.round(snapshot.readiness_score)}</StatusBadge>
                    </div>
                  )) : <div className="py-6 text-sm text-zinc-500">History appears after the first calculation.</div>}
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-5">
              <div className="mb-5"><h2 className="text-base font-semibold">Prop Profile Settings</h2><p className="mt-1 text-xs text-zinc-500">Updating limits affects future calculations; saved snapshots remain historical.</p></div>
              <PropProfileForm accounts={accounts} profile={selectedProfile} />
            </GlassCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
