"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { connectBybitAction, disconnectBybitAction, syncBybitTradesAction } from "@/app/connections/bybit-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BybitConnectionActionState, BybitConnectionSummary } from "@/lib/bybit/types";

const initialState: BybitConnectionActionState = {};
const fieldClass = "h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";

function ActionMessage({ state }: { state: BybitConnectionActionState }) {
  if (state.error) return <p className="text-sm leading-6 text-rose-300">{state.error}</p>;
  if (state.success && state.message) return <p className="text-sm leading-6 text-emerald-300">{state.message}</p>;
  return null;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function BybitConnectionPanel({ connection }: { connection: BybitConnectionSummary | null }) {
  const router = useRouter();
  const [connectState, connectAction, connectPending] = useActionState(connectBybitAction, initialState);
  const [syncState, syncAction, syncPending] = useActionState(syncBybitTradesAction, initialState);
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(disconnectBybitAction, initialState);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (connectState.success || syncState.success || disconnectState.success) router.refresh();
  }, [connectState.success, disconnectState.success, router, syncState.success]);

  if (!connection || connection.status !== "active") {
    return (
      <GlassCard className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
            <KeyRound className="h-5 w-5 text-zinc-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Connect read-only account</h2>
              <StatusBadge tone="neutral">No execution</StatusBadge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Create a dedicated read-only API key. Trade, transfer, and withdrawal permissions must remain disabled. Credentials are encrypted before storage and never returned to the browser.
            </p>
          </div>
        </div>

        <form action={connectAction} className="mt-6 grid gap-4 md:grid-cols-2" autoComplete="off">
          <label className="grid gap-2 text-sm text-zinc-400">
            Account name
            <input name="account_name" required maxLength={80} placeholder="My Bybit Account" className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            Environment
            <select name="environment" defaultValue="mainnet" className={fieldClass}>
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            API key
            <input name="api_key" required minLength={8} spellCheck={false} autoCapitalize="none" className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            API secret
            <input name="api_secret" type="password" required minLength={16} autoComplete="new-password" className={fieldClass} />
          </label>
          <div className="md:col-span-2 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="h-4 w-4" />
              One verification request. No order endpoints are available in TradeMind AI.
            </div>
            <button disabled={connectPending} className="h-11 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60">
              {connectPending ? "Verifying..." : "Connect Read-Only"}
            </button>
          </div>
          <div className="md:col-span-2"><ActionMessage state={connectState} /></div>
        </form>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{connection.accountName}</h2>
              <StatusBadge tone="positive">Connected</StatusBadge>
              <StatusBadge tone="neutral">Read-only</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {connection.environment === "testnet" ? "Testnet" : "Mainnet"} · Key ending {connection.apiKeyHint ? `••••${connection.apiKeyHint}` : "not shown"}
            </p>
          </div>
          <div className="text-left text-xs leading-5 text-zinc-500 md:text-right">
            <div>Last sync</div>
            <div className="text-zinc-300">{formatDateTime(connection.lastSyncedAt)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-500">Imported trades</div>
            <div className="mt-1 text-xl font-semibold text-white">{connection.importedTrades}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-500">Products</div>
            <div className="mt-1 text-sm font-semibold text-white">Linear + Inverse</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-zinc-500">Execution</div>
            <div className="mt-1 text-sm font-semibold text-white">Disabled</div>
          </div>
        </div>

        <form action={syncAction} className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-2 text-sm text-zinc-400">
            Import period
            <select name="days" defaultValue="30" className={fieldClass}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
          <button disabled={syncPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${syncPending ? "animate-spin" : ""}`} />
            {syncPending ? "Syncing..." : "Sync Closed Trades"}
          </button>
        </form>
        <div className="mt-3"><ActionMessage state={syncState} /></div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Initial sync imports completed linear and inverse derivative records. Spot history and automatic scheduled sync are later additions. Existing journal records are never overwritten.
        </p>
      </GlassCard>

      <GlassCard className="border-rose-300/10 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Unplug className="h-4 w-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-white">Disconnect</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Removes encrypted credentials and stops future syncs. Imported trades remain in your journal and account history.
        </p>
        <form action={disconnectAction} className="mt-5 space-y-3">
          <label className="flex items-start gap-3 text-sm leading-6 text-zinc-400">
            <input
              type="checkbox"
              checked={confirmDisconnect}
              onChange={(event) => setConfirmDisconnect(event.target.checked)}
              className="mt-1 h-4 w-4 accent-white"
            />
            I understand that sync will stop and imported trades will be kept.
          </label>
          <input type="hidden" name="confirm" value={confirmDisconnect ? "disconnect" : ""} />
          <button disabled={!confirmDisconnect || disconnectPending} className="h-10 w-full rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-40">
            {disconnectPending ? "Disconnecting..." : "Disconnect Bybit"}
          </button>
          <ActionMessage state={disconnectState} />
        </form>
      </GlassCard>
    </div>
  );
}
