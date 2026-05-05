"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createTradingRuleAction, updateTradingRuleAction, type RuleActionState } from "@/app/rules/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import type { RuleAutoCondition, TradingRule } from "@/lib/rules/types";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const textareaClass = "mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const initialState: RuleActionState = {};

function getCondition(rule?: TradingRule | null): RuleAutoCondition | null {
  const condition = rule?.auto_condition as RuleAutoCondition | null | undefined;
  return condition?.field && condition?.operator ? condition : null;
}

export function RuleForm({ rule = null }: { rule?: TradingRule | null }) {
  const action = rule ? updateTradingRuleAction : createTradingRuleAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const condition = getCondition(rule);

  return (
    <GlassCard className="p-4 md:p-6">
      <form action={formAction} className="space-y-5">
        {rule ? <input type="hidden" name="rule_id" value={rule.id} /> : null}
        <label className="block text-sm">
          <span className="text-zinc-300">Rule Text</span>
          <textarea name="text" required defaultValue={rule?.text ?? ""} placeholder="Wait for confirmation before entry" className={textareaClass} />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-zinc-300">Type</span>
            <select name="type" defaultValue={rule?.type ?? "manual_check"} className={fieldClass}>
              <option value="manual_check">Manual Check</option>
              <option value="auto_check">Auto Check</option>
            </select>
          </label>
          <label className="flex items-end gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
            <input name="active" type="checkbox" defaultChecked={rule?.active ?? true} className="h-4 w-4 accent-white" />
            <span className="text-zinc-300">Active rule</span>
          </label>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-sm font-semibold text-white">Auto Condition</h2>
          <p className="mt-1 text-xs text-zinc-500">Required only for auto-check rules.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="text-zinc-400">Field</span>
              <select name="condition_field" defaultValue={condition?.field ?? "risk_percent"} className={fieldClass}>
                <option value="risk_percent">Risk %</option>
                <option value="fomo_score">FOMO Score</option>
                <option value="news_risk">News Risk</option>
                <option value="trades_per_day">Trades Per Day</option>
                <option value="cooldown_after_loss">Cooldown After Loss</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Operator</span>
              <select name="condition_operator" defaultValue={condition?.operator ?? "lte"} className={fieldClass}>
                <option value="lte">Less than or equal</option>
                <option value="gte">Greater than or equal</option>
                <option value="eq">Equals</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Value</span>
              <input name="condition_value" defaultValue={condition?.value?.toString() ?? ""} placeholder="1" className={fieldClass} />
            </label>
          </div>
        </div>
        {state.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link href="/rules" className="grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">Cancel</Link>
          <button disabled={pending} className="h-11 rounded-xl border border-white/10 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60">
            {pending ? "Saving..." : rule ? "Save Rule" : "Create Rule"}
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
