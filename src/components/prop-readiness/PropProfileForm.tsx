"use client";

import { useActionState } from "react";
import { savePropProfileAction } from "@/app/prop-readiness/actions";
import type { TradingAccount } from "@/lib/accounts/types";
import type { PropProfileFormState, PropReadinessProfile } from "@/lib/prop-readiness/types";

const initialState: PropProfileFormState = {};
const inputClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-white/25";

export function PropProfileForm({ accounts, profile }: { accounts: TradingAccount[]; profile: PropReadinessProfile | null }) {
  const [state, action, pending] = useActionState(savePropProfileAction, initialState);
  const accountValue = profile?.account_scope === "account" && profile.trading_account_id ? profile.trading_account_id : "manual";
  const startedAt = profile?.started_at ? profile.started_at.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-5">
      {profile ? <input type="hidden" name="profile_id" value={profile.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm text-zinc-300">Profile name
          <input name="name" required defaultValue={profile?.name ?? "Prop Evaluation"} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Trading account
          <select name="account" defaultValue={accountValue} className={inputClass}>
            <option value="manual">Manual Journal</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name || `${account.provider} account`}</option>)}
          </select>
        </label>
        <label className="text-sm text-zinc-300">Start date
          <input type="date" name="started_at" required defaultValue={startedAt} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Initial balance
          <input type="number" name="initial_balance" min="1" step="0.01" required defaultValue={profile?.initial_balance ?? 100000} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Profit target %
          <input type="number" name="profit_target_percent" min="0.01" max="100" step="0.01" required defaultValue={profile?.profit_target_percent ?? 10} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Daily loss limit %
          <input type="number" name="max_daily_loss_percent" min="0.01" max="100" step="0.01" required defaultValue={profile?.max_daily_loss_percent ?? 5} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Maximum drawdown %
          <input type="number" name="max_total_drawdown_percent" min="0.01" max="100" step="0.01" required defaultValue={profile?.max_total_drawdown_percent ?? 10} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Drawdown model
          <select name="drawdown_type" defaultValue={profile?.drawdown_type ?? "static"} className={inputClass}>
            <option value="static">Static</option>
            <option value="trailing">Trailing</option>
          </select>
        </label>
        <label className="text-sm text-zinc-300">Maximum risk per trade %
          <input type="number" name="max_risk_per_trade_percent" min="0.01" max="100" step="0.01" required defaultValue={profile?.max_risk_per_trade_percent ?? 1} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Minimum trading days
          <input type="number" name="minimum_trading_days" min="0" step="1" required defaultValue={profile?.minimum_trading_days ?? 5} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Consistency limit % <span className="text-zinc-600">optional</span>
          <input type="number" name="consistency_rule_percent" min="0.01" max="100" step="0.01" defaultValue={profile?.consistency_rule_percent ?? ""} className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Timezone
          <input name="timezone" required defaultValue={profile?.timezone ?? "UTC"} placeholder="Europe/Prague" className={inputClass} />
        </label>
        <label className="text-sm text-zinc-300">Trading day starts
          <input type="time" name="trading_day_start_time" required defaultValue={(profile?.trading_day_start_time ?? "00:00").slice(0, 5)} className={inputClass} />
        </label>
      </div>
      <p className="text-xs leading-5 text-zinc-500">Use the exact limits from your evaluation provider. Calculations use closed journal trades and do not replace the provider dashboard.</p>
      {state.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}
      <button disabled={pending} className="h-11 rounded-xl border border-white/10 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60">
        {pending ? "Saving..." : profile ? "Update Prop Profile" : "Create Prop Profile"}
      </button>
    </form>
  );
}
