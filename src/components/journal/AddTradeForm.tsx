"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createManualTradeAction, type TradeActionState } from "@/app/journal/actions";
import { GlassCard } from "@/components/ui/GlassCard";

const initialState: TradeActionState = {};

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";
const textareaClass = "mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25";

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function AddTradeForm() {
  const [state, formAction, pending] = useActionState(createManualTradeAction, initialState);

  return (
    <GlassCard className="p-4 md:p-6">
      <form action={formAction} noValidate className="space-y-4">
        <FormSection title="Trade Basics" subtitle="Required trade identity and market context.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm">
              <span className="text-zinc-300">Symbol <span className="text-rose-300">*</span></span>
              <input name="symbol" required placeholder="XAUUSD" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Direction <span className="text-rose-300">*</span></span>
              <select name="direction" required className={fieldClass} defaultValue="Long">
                <option>Long</option>
                <option>Short</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Opened At <span className="text-rose-300">*</span></span>
              <input name="opened_at" required type="datetime-local" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Entry Price <span className="text-rose-300">*</span></span>
              <input name="entry_price" required inputMode="decimal" placeholder="2378.65" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Session</span>
              <select name="session" className={fieldClass} defaultValue="">
                <option value="">Select session</option>
                <option>London</option>
                <option>New York</option>
                <option>Asia</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Market Type</span>
              <select name="market_type" className={fieldClass} defaultValue="">
                <option value="">Select market</option>
                <option>Forex</option>
                <option>Crypto</option>
                <option>Indices</option>
                <option>Gold</option>
              </select>
            </label>
          </div>
        </FormSection>

        <FormSection title="Risk & Result" subtitle="Execution levels, outcome, risk, and performance.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm">
              <span className="text-zinc-400">Exit Price</span>
              <input name="exit_price" inputMode="decimal" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Stop Loss</span>
              <input name="stop_loss" inputMode="decimal" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Take Profit</span>
              <input name="take_profit" inputMode="decimal" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Position Size</span>
              <input name="position_size" inputMode="decimal" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Risk %</span>
              <input name="risk_percent" inputMode="decimal" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">RR</span>
              <input name="rr" inputMode="decimal" placeholder="2.4" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">PnL</span>
              <input name="pnl" inputMode="decimal" placeholder="562.50" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Result</span>
              <select name="result" className={fieldClass} defaultValue="Open">
                <option>Win</option>
                <option>Loss</option>
                <option>Breakeven</option>
                <option>Open</option>
              </select>
            </label>
          </div>
        </FormSection>

        <FormSection title="Journal Notes" subtitle="Capture execution reasoning before AI review is added.">
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="text-zinc-400">Reason For Entry</span>
              <textarea name="reason_for_entry" className={textareaClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Notes Before</span>
              <textarea name="notes_before" className={textareaClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Notes After</span>
              <textarea name="notes_after" className={textareaClass} />
            </label>
          </div>
        </FormSection>

        <FormSection title="Tags" subtitle="Comma-separated setup and mistake tags.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-400">Setup Tags</span>
              <input name="setup_tags" placeholder="BOS, FVG, discount" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Mistake Tags</span>
              <input name="mistake_tags" placeholder="early entry, news risk" className={fieldClass} />
            </label>
          </div>
        </FormSection>

        {state.error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/80 p-3 backdrop-blur-xl sm:flex-row sm:justify-end">
          <Link href="/journal" className="grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
            Cancel
          </Link>
          <button disabled={pending} className="h-11 rounded-xl border border-white/10 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving..." : "Save Trade"}
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
