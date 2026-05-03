import Link from "next/link";
import { Cable, CheckCircle2, Clock3, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectionStatusButton } from "@/components/connections/ConnectionStatusButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { connectionStatusTone, deriveRuntimeStatus, integrationProviders, summarizeConnections } from "@/lib/connections/connection-status";
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

function connectionPatchMessage(message: string) {
  if (message.includes("integration_connections") || message.includes("schema cache") || message.includes("does not exist")) {
    return "Integration connections table is not applied yet. Run src/db/patches/007_integration_connections.sql in Supabase SQL Editor.";
  }
  return message;
}

async function getConnectionContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { records: [], error: "Supabase is not configured.", calendarReadable: false, sessionPresent: false };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { records: [], error: "You must be signed in to view connections.", calendarReadable: false, sessionPresent: false };

  const [recordsResult, calendarResult] = await Promise.all([
    supabase.from("integration_connections").select("*").eq("user_id", userData.user.id).order("updated_at", { ascending: false }),
    supabase.from("economic_events").select("id", { count: "exact", head: true }),
  ]);

  return {
    records: recordsResult.error ? [] : ((recordsResult.data ?? []) as IntegrationConnection[]),
    error: recordsResult.error ? connectionPatchMessage(recordsResult.error.message) : null,
    calendarReadable: !calendarResult.error,
    sessionPresent: true,
  };
}

function runtimeStatus(provider: ProviderCard, records: IntegrationConnection[], context: { calendarReadable: boolean; sessionPresent: boolean }): ProviderRuntimeStatus {
  const stored = deriveRuntimeStatus(provider, records);

  if (!stored.lastCheckedAt) {
    if (provider.provider === "supabase") {
      return {
        ...stored,
        status: context.sessionPresent && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "connected" : "error",
        mode: "configured",
        label: "connected",
        metadata: {
          publicUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          anonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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
          openaiKeyPresent: connected,
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

function SummaryCard({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function ConnectionsPage() {
  const context = await getConnectionContext();
  const statuses = integrationProviders.map((provider) => runtimeStatus(provider, context.records, context));
  const summary = summarizeConnections(statuses);

  return (
    <AppShell title="Connections" subtitle="Manage data, AI, broker, and market integrations for your trading workspace.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Cable className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Integration Hub</h2>
                <StatusBadge tone="positive">Safe Setup Mode</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-zinc-500">Status visibility without exposing secrets or enabling execution.</p>
            </div>
          </div>
        </div>

        <GlassCard className="border-white/10 bg-white/[0.04] p-4">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25">
              <LockKeyhole className="h-4 w-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Security policy</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
                Real trading execution is not connected. Broker integrations will start in read-only import mode. Never use withdrawal permissions for exchange API keys. Secrets are not displayed or stored as plain visible UI values.
              </p>
            </div>
          </div>
        </GlassCard>

        {context.error ? <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{context.error}</GlassCard> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={CheckCircle2} label="Connected" value={String(summary.connected)} />
          <SummaryCard icon={ShieldCheck} label="Simulated / Fallback" value={String(summary.fallback)} />
          <SummaryCard icon={Clock3} label="Coming Soon" value={String(summary.comingSoon)} />
          <SummaryCard icon={ShieldAlert} label="Not Connected" value={String(summary.notConnected)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {integrationProviders.map((provider, index) => {
            const status = statuses[index];
            return (
              <GlassCard key={provider.provider} className="p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{provider.name}</h2>
                      <StatusBadge tone={connectionStatusTone(status.status)}>{formatStatus(status.status)}</StatusBadge>
                      <StatusBadge tone="neutral">{provider.category}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{provider.description}</p>
                  </div>
                  <div className="text-left text-xs text-zinc-500 md:text-right">
                    <div>Mode <span className="capitalize text-zinc-300">{formatMode(status.mode)}</span></div>
                    <div className="mt-1">Last checked <span className="text-zinc-300">{formatDateTime(status.lastCheckedAt)}</span></div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <div className="text-xs text-zinc-500">What it powers</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {provider.powers.map((item) => (
                        <span key={item} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {provider.actionLabel === "Test Status" ? <ConnectionStatusButton provider={provider.provider} /> : null}
                    <Link href={`/connections/${provider.provider}`} className="grid h-10 place-items-center rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
                      View Details
                    </Link>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
