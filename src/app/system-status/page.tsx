import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Bot, CalendarDays, Database, DollarSign, LineChart, Radio, ShieldCheck, Signal } from "lucide-react";
import { ConnectionStatusButton } from "@/components/connections/ConnectionStatusButton";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AIUsageLog } from "@/lib/ai/usage-types";
import { isAdminUser } from "@/lib/auth/admin";
import { connectionStatusTone, deriveRuntimeStatus, systemServiceProviders } from "@/lib/connections/connection-status";
import type { ConnectionMode, ConnectionStatus, IntegrationConnection, ProviderCard, ProviderRuntimeStatus } from "@/lib/connections/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/trading/stats";
import { getCurrentUsagePeriod, getUserUsage, type UserUsageSnapshot } from "@/lib/usage/user-usage";

function formatDateTime(value: string | null) {
  if (!value) return "Not checked";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: ConnectionStatus) {
  return status.replaceAll("_", " ");
}

function formatMode(mode: ConnectionMode) {
  return mode.replaceAll("_", " ");
}

function patchMessage(message: string) {
  if (message.includes("integration_connections") || message.includes("schema cache") || message.includes("does not exist")) {
    return "Integration connections table is not applied yet. Run src/db/patches/007_integration_connections.sql in Supabase SQL Editor.";
  }
  return message;
}

interface AIUsageSummary {
  usage: UserUsageSnapshot | null;
  lastSource: string;
  lastModel: string;
  estimatedCostThisMonth: number | null;
}

async function getSystemContext() {
  const emptyUsageSummary: AIUsageSummary = {
    usage: null,
    lastSource: "None",
    lastModel: "None",
    estimatedCostThisMonth: null,
  };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { records: [], error: "Database service is not configured.", calendarReadable: false, calendarSource: "not_connected", sessionPresent: false, aiUsageSummary: emptyUsageSummary };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { records: [], error: "You must be signed in to view system status.", calendarReadable: false, calendarSource: "not_connected", sessionPresent: false, aiUsageSummary: emptyUsageSummary };

  const { periodStart, periodEnd } = getCurrentUsagePeriod();

  const [recordsResult, calendarResult, usage, latestUsageResult, monthlyUsageResult] = await Promise.all([
    supabase.from("integration_connections").select("id,user_id,provider,status,mode,display_name,metadata,last_checked_at,created_at,updated_at").eq("user_id", userData.user.id).order("updated_at", { ascending: false }),
    supabase.from("economic_events").select("source").limit(25),
    getUserUsage(userData.user.id),
    supabase
      .from("ai_usage_logs")
      .select("generation_source, model, created_at")
      .eq("user_id", userData.user.id)
      .eq("feature", "trade_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_usage_logs")
      .select("estimated_cost")
      .eq("user_id", userData.user.id)
      .gte("created_at", periodStart)
      .lt("created_at", periodEnd),
  ]);

  const monthlyCosts = monthlyUsageResult.error ? [] : ((monthlyUsageResult.data ?? []) as Pick<AIUsageLog, "estimated_cost">[]);
  const estimatedCostThisMonth = monthlyCosts.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const latestUsage = latestUsageResult.error ? null : (latestUsageResult.data as Pick<AIUsageLog, "generation_source" | "model"> | null);

  const calendarRows = calendarResult.error ? [] : ((calendarResult.data ?? []) as { source: string | null }[]);
  const calendarSources = new Set(calendarRows.map((row) => row.source || "manual"));
  const calendarSource = calendarResult.error || !calendarRows.length ? "not_connected" : calendarSources.has("provider") ? "provider" : calendarSources.has("manual") ? "manual" : "sample";

  return {
    records: recordsResult.error ? [] : ((recordsResult.data ?? []) as IntegrationConnection[]),
    error: recordsResult.error ? patchMessage(recordsResult.error.message) : null,
    calendarReadable: !calendarResult.error,
    calendarSource,
    sessionPresent: true,
    aiUsageSummary: {
      usage,
      lastSource: latestUsage?.generation_source === "ai" ? "AI" : latestUsage?.generation_source === "rules" ? "Local Rules" : "None",
      lastModel: latestUsage?.model ?? "None",
      estimatedCostThisMonth,
    },
  };
}

function runtimeStatus(provider: ProviderCard, records: IntegrationConnection[], context: { calendarReadable: boolean; calendarSource: string; sessionPresent: boolean }): ProviderRuntimeStatus {
  const stored = deriveRuntimeStatus(provider, records);

  if (!stored.lastCheckedAt) {
    if (provider.provider === "supabase") {
      const connected = context.sessionPresent && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      return {
        ...stored,
        status: connected ? "connected" : "error",
        mode: "configured",
        label: connected ? "connected" : "error",
        metadata: {
          database: connected ? "configured" : "not configured",
          auth: context.sessionPresent ? "active session" : "no session",
        },
      };
    }

    if (provider.provider === "ai-provider") {
      const connected = Boolean(process.env.OPENAI_API_KEY);
      return {
        ...stored,
        status: connected ? "connected" : "fallback",
        mode: connected ? "configured" : "fallback",
        label: connected ? "connected" : "fallback",
        metadata: {
          service: connected ? "configured" : "local fallback",
          model: process.env.OPENAI_MODEL || "local-rules",
        },
      };
    }

    if (provider.provider === "economic-calendar") {
      const sampleOnly = context.calendarSource === "sample";
      return {
        ...stored,
        status: context.calendarReadable && !sampleOnly ? "connected" : context.calendarReadable ? "fallback" : "not_connected",
        mode: context.calendarSource === "not_connected" ? "safe_setup" : "configured",
        label: context.calendarSource,
        metadata: { dataSource: context.calendarSource },
      };
    }
  }

  return stored;
}

function MetadataList({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (!entries.length) return <p className="mt-3 text-sm text-zinc-500">Run a safe status check to store metadata.</p>;

  return (
    <div className="mt-3 grid gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
          <span className="text-zinc-500">{key}</span>
          <span className="max-w-[58%] truncate text-right text-zinc-200">{typeof value === "boolean" ? (value ? "yes" : "no") : String(value ?? "-")}</span>
        </div>
      ))}
    </div>
  );
}

function SystemServiceCard({ provider, status }: { provider: ProviderCard; status: ProviderRuntimeStatus }) {
  const Icon = provider.provider === "supabase" ? Database : provider.provider === "ai-provider" ? Bot : CalendarDays;

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className="h-4 w-4 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">{provider.name}</h2>
            <StatusBadge tone={connectionStatusTone(status.status)}>{formatStatus(status.status)}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{provider.description}</p>
        </div>
        <ConnectionStatusButton provider={provider.provider} />
      </div>
      <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">Mode</div>
          <div className="mt-1 capitalize text-white">{formatMode(status.mode)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">Last Checked</div>
          <div className="mt-1 text-white">{formatDateTime(status.lastCheckedAt)}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs text-zinc-500">Powers</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {provider.powers.map((item) => (
            <span key={item} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300">
              {item}
            </span>
          ))}
        </div>
      </div>
      <MetadataList metadata={status.metadata} />
    </GlassCard>
  );
}

function EngineCard({ icon: Icon, title, status, mode, powers }: { icon: typeof Activity; title: string; status: ConnectionStatus; mode: string; powers: string[] }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        <StatusBadge tone={connectionStatusTone(status)}>{formatStatus(status)}</StatusBadge>
      </div>
      <div className="mt-3 text-sm text-zinc-400">Mode: <span className="text-zinc-200">{mode}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {powers.map((item) => (
          <span key={item} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300">
            {item}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

function AIUsageSummaryCard({ summary }: { summary: AIUsageSummary }) {
  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <DollarSign className="h-4 w-4 text-zinc-400" />
        <h2 className="text-lg font-semibold text-white">AI Usage This Month</h2>
        <StatusBadge tone="neutral">Cost control foundation</StatusBadge>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Usage is tracked for the current signed-in user only. Billing and hard limits are not enabled yet.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">AI Reviews</div>
          <div className="mt-1 text-xl font-semibold text-white">{summary.usage?.ai_reviews_count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">Last Source</div>
          <div className="mt-1 text-white">{summary.lastSource}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">Last Model</div>
          <div className="mt-1 truncate text-white">{summary.lastModel}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-zinc-500">Estimated Cost</div>
          <div className="mt-1 text-white">{summary.estimatedCostThisMonth == null ? "$0.00" : formatMoney(summary.estimatedCostThisMonth)}</div>
        </div>
      </div>
    </GlassCard>
  );
}

export default async function SystemStatusPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?next=/system-status");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login?next=/system-status");

  if (!isAdminUser(userData.user)) {
    return (
      <AppShell title="System Status" subtitle="Admin-only platform diagnostics." user={userData.user}>
        <GlassCard className="mx-auto max-w-2xl p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-300" />
            <h2 className="text-xl font-semibold text-white">Admin access required</h2>
            <StatusBadge tone="neutral">Restricted</StatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            System Status is available only for platform administrators.
          </p>
          <Link href="/dashboard" className="mt-5 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
            Back to Dashboard
          </Link>
        </GlassCard>
      </AppShell>
    );
  }

  const context = await getSystemContext();
  const statuses = systemServiceProviders.map((provider) => runtimeStatus(provider, context.records, context));

  return (
    <AppShell title="System Status" subtitle="Internal platform services and safe runtime checks." user={userData.user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-300" />
            <h2 className="text-xl font-semibold">Internal platform services</h2>
            <StatusBadge tone="neutral">Not user trading connections</StatusBadge>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            This page shows platform-managed services used by TradeMind AI. It only shows connected, fallback, not connected, or disabled states with safe metadata. Secrets and raw environment values are never displayed.
          </p>
        </GlassCard>

        {context.error ? <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{context.error}</GlassCard> : null}

        <AIUsageSummaryCard summary={context.aiUsageSummary} />

        <div className="grid gap-4 xl:grid-cols-3">
          {systemServiceProviders.map((provider, index) => (
            <SystemServiceCard key={provider.provider} provider={provider} status={statuses[index]} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <EngineCard icon={LineChart} title="Market Data Feed" status="not_connected" mode="Waiting for provider integration" powers={["Market scanner", "Dashboard market panel", "Signal validation"]} />
          <EngineCard icon={Activity} title="Scanner Engine" status="not_connected" mode="Waiting for real market data" powers={["SMC checklist", "Bias state", "Setup readiness"]} />
          <EngineCard icon={Radio} title="Backtest Engine" status="not_connected" mode="Waiting for historical market data" powers={["Backtest Lab", "Dashboard latest backtest", "Strategy validation"]} />
          <EngineCard icon={Signal} title="Signal Engine" status="not_connected" mode="Waiting for market data" powers={["Signals page", "Signal detail", "Dashboard signal preview"]} />
        </div>

        <GlassCard className="border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-semibold text-white">Data isolation</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
            User data is isolated by Supabase Auth user ID and protected with Row Level Security. Trades, strategies, backtests, signals, AI reviews, and connection metadata are scoped to the current authenticated user.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
