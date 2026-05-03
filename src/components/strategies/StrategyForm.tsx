"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStrategyAction, updateStrategyAction } from "@/app/strategies/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { defaultStrategyRules } from "@/lib/strategies/defaults";
import { marketOptions, sessionOptions, symbolOptions, type Strategy, type StrategyFormState, type StrategyRules } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";

const initialState: StrategyFormState = {};
const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const textareaClass = "mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CheckboxGroup({ name, options, selected }: { name: string; options: string[]; selected: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => (
        <label key={option} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300">
          <input name={name} type="checkbox" value={option} defaultChecked={selected.includes(option)} className="h-4 w-4 accent-white" />
          {option}
        </label>
      ))}
    </div>
  );
}

function RuleCheckbox({ name, label, defaultChecked }: { name: keyof StrategyRules; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-white" />
      {label}
    </label>
  );
}

interface StrategyFormProps {
  mode: "create" | "edit";
  strategy?: Strategy;
}

export function StrategyForm({ mode, strategy }: StrategyFormProps) {
  const action = mode === "edit" ? updateStrategyAction : createStrategyAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const rules = normalizeStrategyRules(strategy?.rules_json ?? defaultStrategyRules);

  return (
    <GlassCard className="p-4 md:p-6">
      <form action={formAction} noValidate className="space-y-4">
        {strategy ? <input type="hidden" name="strategy_id" value={strategy.id} /> : null}

        <FormSection title="Basics" subtitle="Name the playbook and choose whether it is currently active.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block text-sm">
              <span className="text-zinc-300">Name <span className="text-rose-300">*</span></span>
              <input name="name" required defaultValue={strategy?.name ?? ""} placeholder="ICT London Kill Zone" className={fieldClass} />
            </label>
            <label className="mt-7 flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300 lg:mt-7">
              <input name="is_active" type="checkbox" defaultChecked={strategy?.is_active ?? true} className="h-4 w-4 accent-white" />
              Active strategy
            </label>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-zinc-400">Description</span>
            <textarea name="description" defaultValue={strategy?.description ?? ""} className={textareaClass} />
          </label>
        </FormSection>

        <FormSection title="Markets & Symbols" subtitle="Select the instruments this strategy is designed for.">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs text-zinc-500">Markets</div>
              <CheckboxGroup name="markets" options={marketOptions} selected={rules.markets} />
            </div>
            <div>
              <div className="mb-2 text-xs text-zinc-500">Symbols</div>
              <CheckboxGroup name="symbols" options={symbolOptions} selected={rules.symbols} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Sessions" subtitle="Choose the trade windows where this setup is valid.">
          <CheckboxGroup name="sessions" options={sessionOptions} selected={rules.sessions} />
        </FormSection>

        <FormSection title="Smart Money / ICT Rules" subtitle="Define the structural confirmations required before entry.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm xl:col-span-3">
              <span className="text-zinc-300">Direction Bias</span>
              <select name="directionBias" defaultValue={rules.directionBias} className={fieldClass}>
                <option value="trend-following">Trend-following</option>
                <option value="reversal">Reversal</option>
                <option value="both">Both</option>
              </select>
            </label>
            <RuleCheckbox name="requiresBos" label="Requires BOS" defaultChecked={rules.requiresBos} />
            <RuleCheckbox name="requiresChoch" label="Requires CHoCH" defaultChecked={rules.requiresChoch} />
            <RuleCheckbox name="requiresLiquiditySweep" label="Requires Liquidity Sweep" defaultChecked={rules.requiresLiquiditySweep} />
            <RuleCheckbox name="requiresFvg" label="Requires FVG" defaultChecked={rules.requiresFvg} />
            <RuleCheckbox name="requiresOrderBlock" label="Requires Order Block" defaultChecked={rules.requiresOrderBlock} />
          </div>
        </FormSection>

        <FormSection title="Risk Rules" subtitle="Set minimum trade quality and maximum risk boundaries.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-300">Minimum RR</span>
              <input name="minimumRr" required inputMode="decimal" defaultValue={rules.minimumRr} className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Max Risk %</span>
              <input name="maxRiskPercent" required inputMode="decimal" defaultValue={rules.maxRiskPercent} className={fieldClass} />
            </label>
          </div>
        </FormSection>

        <FormSection title="News Filter" subtitle="Protect the strategy from unplanned volatility windows.">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300">
              <input name="avoidHighImpactNews" type="checkbox" defaultChecked={rules.avoidHighImpactNews} className="h-4 w-4 accent-white" />
              Avoid high-impact news
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">News Buffer Minutes</span>
              <input name="newsBufferMinutes" required inputMode="numeric" defaultValue={rules.newsBufferMinutes} className={fieldClass} />
            </label>
          </div>
        </FormSection>

        <FormSection title="Entry / SL / TP Models" subtitle="Choose the execution models used by this strategy.">
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="text-zinc-300">Entry Model</span>
              <select name="entryModel" defaultValue={rules.entryModel} className={fieldClass}>
                <option value="fvg-retest">FVG retest</option>
                <option value="order-block-retest">Order block retest</option>
                <option value="liquidity-sweep-confirmation">Liquidity sweep confirmation</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Stop Loss Model</span>
              <select name="stopLossModel" defaultValue={rules.stopLossModel} className={fieldClass}>
                <option value="swing-high-low">Swing high/low</option>
                <option value="order-block-invalid">Order block invalidation</option>
                <option value="fixed-pips">Fixed pips</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Take Profit Model</span>
              <select name="takeProfitModel" defaultValue={rules.takeProfitModel} className={fieldClass}>
                <option value="next-liquidity">Next liquidity</option>
                <option value="fixed-rr">Fixed RR</option>
                <option value="session-high-low">Session high/low</option>
                <option value="manual">Manual</option>
              </select>
            </label>
          </div>
        </FormSection>

        {state.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/80 p-3 backdrop-blur-xl sm:flex-row sm:justify-end">
          <Link href="/strategies" className="grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
            Cancel
          </Link>
          <button disabled={pending} className="h-11 rounded-xl border border-white/10 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving..." : mode === "edit" ? "Update Strategy" : "Create Strategy"}
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
