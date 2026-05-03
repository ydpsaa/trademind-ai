import type { MarketBias, MarketScanResult, MarketSymbol, MarketType, NewsRiskLevel, PremiumDiscountState, ScannerSignalState, ScannerTimeframe, StructureState } from "@/lib/scanner/types";
import { scannerSymbols } from "@/lib/scanner/types";

const symbolMeta: Record<MarketSymbol, { marketType: MarketType; base: number; precision: number }> = {
  XAUUSD: { marketType: "Gold", base: 2378.65, precision: 2 },
  EURUSD: { marketType: "Forex", base: 1.0887, precision: 4 },
  GBPUSD: { marketType: "Forex", base: 1.2634, precision: 4 },
  NAS100: { marketType: "Indices", base: 18732.6, precision: 1 },
  US30: { marketType: "Indices", base: 39753.4, precision: 1 },
  BTCUSDT: { marketType: "Crypto", base: 66521.8, precision: 1 },
  ETHUSDT: { marketType: "Crypto", base: 3228.4, precision: 1 },
};

const structureStates: StructureState[] = ["trending", "ranging", "reversal", "unclear"];
const newsRisks: NewsRiskLevel[] = ["low", "medium", "high", "extreme"];
const setupStates: ScannerSignalState[] = ["no-setup", "watching", "forming", "ready"];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

function formatPrice(value: number, precision: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function checklistConfidence(items: boolean[], newsRisk: NewsRiskLevel, setup: ScannerSignalState) {
  const checklistScore = items.filter(Boolean).length * 12;
  const setupBoost = setup === "ready" ? 20 : setup === "forming" ? 12 : setup === "watching" ? 6 : 0;
  const newsPenalty = newsRisk === "extreme" ? 22 : newsRisk === "high" ? 14 : newsRisk === "medium" ? 6 : 0;
  return Math.min(94, Math.max(18, 28 + checklistScore + setupBoost - newsPenalty));
}

function summaryFor(result: Omit<MarketScanResult, "summary" | "keyLevels" | "warnings" | "updatedAt">) {
  const bias = result.bias === "neutral" ? "neutral bias" : `${result.bias} bias`;
  const setup = result.setupReadiness === "ready" ? "setup is marked ready" : `setup is ${result.setupReadiness.replace("-", " ")}`;
  return `${result.symbol} shows ${bias} with ${result.structureState} structure. ${setup}; scanner output is simulated until live market data is connected.`;
}

function warningsFor(newsRisk: NewsRiskLevel, setup: ScannerSignalState) {
  const warnings = ["Simulated scanner output. Real market data is not connected yet."];
  if (newsRisk === "high" || newsRisk === "extreme") {
    warnings.push("News risk is elevated. Avoid treating scanner output as a trade signal.");
  }
  if (setup === "ready") {
    warnings.push("Ready state is mock readiness only and is not a live signal.");
  }
  return warnings;
}

export function getMarketScanResults(timeframe: ScannerTimeframe = "15m"): MarketScanResult[] {
  const now = new Date().toISOString();

  return scannerSymbols.map((symbol, index) => {
    const meta = symbolMeta[symbol];
    const seed = hashString(`${symbol}:${timeframe}`);
    const score = seed % 100;
    const bias: MarketBias = score % 3 === 0 ? "bearish" : score % 3 === 1 ? "bullish" : "neutral";
    const structureState = pick(structureStates, seed, index);
    const newsRiskLevel = pick(newsRisks, seed, index + 1);
    const setupReadiness = pick(setupStates, seed, index + 2);
    const bosDetected = score % 2 === 0;
    const chochDetected = score % 5 === 0 || structureState === "reversal";
    const liquiditySweepDetected = score % 3 !== 0;
    const fvgDetected = score % 4 !== 1;
    const orderBlockDetected = score % 6 === 0 || setupReadiness === "ready";
    const premiumDiscountState: PremiumDiscountState = bias === "bullish" ? "discount" : bias === "bearish" ? "premium" : score % 2 === 0 ? "equilibrium" : "unknown";
    const confidence = checklistConfidence([bosDetected, chochDetected, liquiditySweepDetected, fvgDetected, orderBlockDetected], newsRiskLevel, setupReadiness);
    const levelStep = meta.base * (meta.marketType === "Forex" ? 0.004 : 0.012);
    const resultBase = {
      symbol,
      marketType: meta.marketType,
      timeframe,
      bias,
      structureState,
      bosDetected,
      chochDetected,
      liquiditySweepDetected,
      fvgDetected,
      orderBlockDetected,
      premiumDiscountState,
      newsRiskLevel,
      setupReadiness,
      confidence,
    };

    return {
      ...resultBase,
      summary: summaryFor(resultBase),
      keyLevels: [
        { label: "Previous High", value: formatPrice(meta.base + levelStep, meta.precision) },
        { label: "Equilibrium", value: formatPrice(meta.base, meta.precision) },
        { label: "Previous Low", value: formatPrice(meta.base - levelStep, meta.precision) },
      ],
      warnings: warningsFor(newsRiskLevel, setupReadiness),
      updatedAt: now,
    };
  });
}

export function getMarketScanResult(symbol: string, timeframe: ScannerTimeframe = "15m") {
  return getMarketScanResults(timeframe).find((result) => result.symbol === symbol);
}
