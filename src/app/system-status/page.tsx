import { Activity, Bot, CalendarDays, Database, LineChart, Radio, ShieldCheck, Signal } from "lucide-react";
import { ConnectionStatusButton } from "@/components/connections/ConnectionStatusButton";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { connectionStatusTone, deriveRuntimeStatus, systemServiceProviders } from "@/lib/connections/connection-status";
import type { ConnectionMode, ConnectionStatus, IntegrationConnection, ProviderCard, ProviderRuntimeStatus } from "@/lib/connections/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

async function getSystemContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { records: [], error: "Supabase is not configured.", calendarReadable: false, sessionPresent: false };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { records: [], error: "You must be signed in to view system status.", calendarReadable: false, sessionPresent: false };

  const [recordsResult, calendarResult] = await Promise.all([
    supabase.from("integration_connections").select("*").eq("user_id", userData.user.id).order("updated_at", { ascending: false }),
    supabase.from("economic_events").select("id", { count: "exact", head: true }),
  ]);

  return {
    records: recordsResult.error ? [] : ((recordsResult.data ?? []) as IntegrationConnection[]),
    error: recordsResult.error ? patchMessage(recordsResult.error.message) : null,
    calendarReadable: !calendarResult.error,
    sessionPresent: true,
  };
}

function runtimeStatus(provider: ProviderCard, records: IntegrationConnection[], context: { calendarReadable: boolean; sessionPresent: boolean }): ProviderRuntimeStatus {
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
          publicUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          anonKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          sessionPresent: context.sessionPresent,
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
          openaiKeyConfigured: connected,
          provider: process.env.AI_PROVIDER || "openai",
          model: process.env.OPENAI_MODEL || "local-rules",
        },
      };
    }

    if (provider.provider === "economic-calendar") {
      return {
        ...stored,
        status: context.calendarReadable ? "connected" : "error",
        mode: "configured",
        label: context.calendarReadable ? "connected" : "error",
        metadata: { readable: context.calendarReadable },
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

export default async function SystemStatusPage() {
  const context = await getSystemContext();
  const statuses = systemServiceProviders.map((provider) => runtimeStatus(provider, context.records, context));

  return (
    <AppShell title="System Status" subtitle="Internal platform services and safe runtime checks.">
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-300" />
            <h2 className="text-xl font-semibold">Internal platform services</h2>
            <StatusBadge tone="neutral">Not user trading connections</StatusBadge>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            This page shows platform-managed services used by TradeMind AI. It only shows configured yes/no, connected/fallback/simulated state, and safe metadata. Secrets and raw environment values are never displayed.
          </p>
        </GlassCard>

        {context.error ? <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{context.error}</GlassCard> : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {systemServiceProviders.map((provider, index) => (
            <SystemServiceCard key={provider.provider} provider={provider} status={statuses[index]} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <EngineCard icon={LineChart} title="Market Data Mode" status="simulated" mode="Local simulated data" powers={["Market scanner", "Dashboard market panel", "Signal setup ideas"]} />
          <EngineCard icon={Activity} title="Scanner Engine" status="simulated" mode="Local scanner engine" powers={["SMC checklist", "Bias state", "Setup readiness"]} />
          <EngineCard icon={Radio} title="Backtest Engine" status="simulated" mode="Deterministic mock engine" powers={["Backtest Lab", "Dashboard latest backtest", "Strategy previews"]} />
          <EngineCard icon={Signal} title="Signal Engine" status="simulated" mode="Simulated setup engine" powers={["Signals page", "Signal detail", "Dashboard signal preview"]} />
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
