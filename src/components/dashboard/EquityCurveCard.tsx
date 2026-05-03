import { ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { equityCurve } from "@/lib/mock-data";

function EquityCurveSvg() {
  return (
    <svg className="h-[210px] w-full sm:h-[240px]" viewBox="0 0 760 250" preserveAspectRatio="none" aria-label="Equity curve preview">
      <defs>
        <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {[54, 96, 138, 180].map((y) => (
        <line key={y} x1="0" x2="760" y1={y} y2={y} stroke="rgba(255,255,255,.09)" strokeDasharray="4 6" />
      ))}
      <path
        d="M0 185 C22 176 28 152 54 166 C78 178 88 136 116 148 C134 155 138 127 162 135 C190 149 198 110 226 122 C254 135 276 112 304 132 C334 154 354 148 384 112 C404 89 420 100 436 82 C456 58 470 68 486 44 C506 10 520 52 540 34 C568 14 588 73 612 40 C636 11 648 73 672 48 C702 18 718 88 738 58 C750 40 754 65 760 55 L760 250 L0 250 Z"
        fill="url(#equityFill)"
      />
      <path
        d="M0 185 C22 176 28 152 54 166 C78 178 88 136 116 148 C134 155 138 127 162 135 C190 149 198 110 226 122 C254 135 276 112 304 132 C334 154 354 148 384 112 C404 89 420 100 436 82 C456 58 470 68 486 44 C506 10 520 52 540 34 C568 14 588 73 612 40 C636 11 648 73 672 48 C702 18 718 88 738 58 C750 40 754 65 760 55"
        fill="none"
        stroke="rgba(255,255,255,.92)"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function EquityCurveCard() {
  return (
    <GlassCard className="p-4 lg:col-span-8 2xl:col-span-9">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Equity Curve</h2>
            <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 text-xs text-white">
              All Accounts <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{equityCurve.value}</div>
            <div className="pb-1 text-sm text-emerald-300">{equityCurve.delta}</div>
          </div>
        </div>
        <div className="hidden rounded-xl bg-black/25 p-1 text-xs text-zinc-400 sm:flex">
          {["1D", "7D", "1M", "3M", "1Y"].map((range) => (
            <button key={range} className={`h-8 rounded-lg px-3 ${range === "7D" ? "bg-white/12 text-white" : ""}`}>
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-5 hidden h-[190px] flex-col justify-between text-[11px] text-zinc-500 md:flex">
          {equityCurve.yAxis.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="pl-0 md:pl-10">
          <EquityCurveSvg />
        </div>
        <div className="hidden justify-between pl-10 text-[11px] text-zinc-500 md:flex">
          {equityCurve.labels.map((day) => <span key={day}>{day}</span>)}
        </div>
      </div>
    </GlassCard>
  );
}
