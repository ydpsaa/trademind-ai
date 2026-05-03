import type { MarketScanResult } from "@/lib/scanner/types";
import type { Strategy } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";
import type { SignalDirection, SignalEngineResult, SignalSetupType, SignalStatus } from "@/lib/signals/types";

function numericLevel(value: string) {
  return Number(value.replace(/,/g, ""));
}

function formatLevel(value: number, symbol: string) {
  const precision = symbol.includes("USD") && !symbol.includes("XAU") ? 4 : symbol.includes("USDT") || symbol === "NAS100" || symbol === "US30" ? 1 : 2;
  return value.toLocaleString("en-US", { maximumFractionDigits: precision, minimumFractionDigits: precision });
}

function setupTypeFor(scanner: MarketScanResult): SignalSetupType {
  if (scanner.liquiditySweepDetected && scanner.chochDetected) return "Liquidity Sweep Reversal";
  if (scanner.orderBlockDetected) return "Order Block Retest";
  if (scanner.bosDetected && scanner.fvgDetected) return "BOS + FVG Continuation";
  return "Session Continuation";
}

function statusFor(scanner: MarketScanResult): SignalStatus {
  if (scanner.setupReadiness === "ready") return "ready";
  if (scanner.setupReadiness === "forming") return "forming";
  return "watching";
}

function directionFor(scanner: MarketScanResult): SignalDirection {
  if (scanner.bias === "bearish") return "Short";
  return "Long";
}

function confidenceFor(scanner: MarketScanResult, rulesStrictness: number) {
  const newsPenalty = scanner.newsRiskLevel === "extreme" ? 18 : scanner.newsRiskLevel === "high" ? 10 : scanner.newsRiskLevel === "medium" ? 4 : 0;
  return Math.min(96, Math.max(45, scanner.confidence + rulesStrictness * 2 - newsPenalty));
}

export function generateSimulatedSignals(strategies: Strategy[], scannerResults: MarketScanResult[]): SignalEngineResult[] {
  return strategies.flatMap((strategy) => {
    const rules = normalizeStrategyRules(strategy.rules_json);
    const symbols = new Set(rules.symbols);
    const strictness = [rules.requiresBos, rules.requiresChoch, rules.requiresLiquiditySweep, rules.requiresFvg, rules.requiresOrderBlock].filter(Boolean).length;

    return scannerResults
      .filter((scanner) => symbols.has(scanner.symbol) || rules.markets.includes(scanner.marketType))
      .slice(0, 4)
      .map((scanner) => {
        const direction = directionFor(scanner);
        const setupType = setupTypeFor(scanner);
        const mid = numericLevel(scanner.keyLevels.find((level) => level.label === "Equilibrium")?.value ?? scanner.keyLevels[0]?.value ?? "1");
        const spread = Math.max(mid * 0.004, 0.0005);
        const entryLow = direction === "Long" ? mid - spread * 0.3 : mid + spread * 0.1;
        const entryHigh = direction === "Long" ? mid + spread * 0.1 : mid + spread * 0.5;
        const stopLoss = direction === "Long" ? mid - spread : mid + spread;
        const takeProfit = direction === "Long" ? mid + spread * Math.max(1.5, rules.minimumRr) : mid - spread * Math.max(1.5, rules.minimumRr);
        const confidence = confidenceFor(scanner, strictness);

        return {
          strategy_id: strategy.id,
          symbol: scanner.symbol,
          market_type: scanner.marketType,
          direction,
          entry_zone: `${formatLevel(entryLow, scanner.symbol)} - ${formatLevel(entryHigh, scanner.symbol)}`,
          stop_loss: Number(stopLoss.toFixed(6)),
          take_profit: Number(takeProfit.toFixed(6)),
          confidence,
          reasoning: `${strategy.name} aligns with ${scanner.symbol} ${scanner.bias} scanner context. ${setupType} is a simulated setup idea from checklist state, not trading advice or execution instruction.`,
          status: statusFor(scanner),
          news_risk: scanner.newsRiskLevel,
          setup_type: setupType,
          timeframe: scanner.timeframe,
          engine_type: "simulated",
          scanner_snapshot: scanner,
        };
      });
  });
}
