import { formatMarketPrice, getMarketInstrument } from "@/lib/market-data/instruments";
import type { MarketCandle, MarketSnapshot } from "@/lib/market-data/types";

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function analyzeMarketCandles(candles: MarketCandle[]): Omit<MarketSnapshot, "id"> {
  if (candles.length < 20) throw new Error("MARKET_DATA_INSUFFICIENT_HISTORY");

  const ordered = [...candles].sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
  const recent = ordered.slice(-20);
  const latest = recent.at(-1)!;
  const previous = recent.at(-2)!;
  const instrument = getMarketInstrument(latest.symbol);
  const closes = recent.map((item) => item.close);
  const sma20 = average(closes);
  const firstHalf = recent.slice(0, 10);
  const secondHalf = recent.slice(10);
  const firstHigh = Math.max(...firstHalf.map((item) => item.high));
  const firstLow = Math.min(...firstHalf.map((item) => item.low));
  const secondHigh = Math.max(...secondHalf.map((item) => item.high));
  const secondLow = Math.min(...secondHalf.map((item) => item.low));
  const rangeHigh = Math.max(...recent.map((item) => item.high));
  const rangeLow = Math.min(...recent.map((item) => item.low));
  const midpoint = (rangeHigh + rangeLow) / 2;
  const priorWindow = recent.slice(-11, -1);
  const priorHigh = Math.max(...priorWindow.map((item) => item.high));
  const priorLow = Math.min(...priorWindow.map((item) => item.low));
  const momentumPercent = sma20 === 0 ? 0 : ((latest.close - sma20) / sma20) * 100;

  const bias = Math.abs(momentumPercent) < 0.08 ? "neutral" : latest.close > sma20 ? "bullish" : "bearish";
  const higherStructure = secondHigh > firstHigh && secondLow > firstLow;
  const lowerStructure = secondHigh < firstHigh && secondLow < firstLow;
  const structureState = higherStructure || lowerStructure
    ? (bias === "bullish" && lowerStructure) || (bias === "bearish" && higherStructure) ? "reversal" : "trending"
    : Math.abs(momentumPercent) < 0.15 ? "ranging" : "unclear";
  const bosDetected = latest.close > priorHigh || latest.close < priorLow;
  const priorDirection = previous.close >= recent.at(-3)!.close ? "up" : "down";
  const latestDirection = latest.close >= previous.close ? "up" : "down";
  const chochDetected = priorDirection !== latestDirection && (
    (latestDirection === "up" && latest.close > Math.max(...recent.slice(-6, -1).map((item) => item.high)))
    || (latestDirection === "down" && latest.close < Math.min(...recent.slice(-6, -1).map((item) => item.low)))
  );
  const liquiditySweepDetected = (latest.high > priorHigh && latest.close < priorHigh)
    || (latest.low < priorLow && latest.close > priorLow);
  const twoBack = recent.at(-3)!;
  const fvgDetected = latest.low > twoBack.high || latest.high < twoBack.low;
  const orderBlockDetected = bosDetected && ((latestDirection === "up" && previous.close < previous.open) || (latestDirection === "down" && previous.close > previous.open));
  const equilibriumBand = Math.max((rangeHigh - rangeLow) * 0.08, Math.abs(midpoint) * 0.0001);
  const premiumDiscountState = Math.abs(latest.close - midpoint) <= equilibriumBand
    ? "equilibrium"
    : latest.close > midpoint ? "premium" : "discount";
  const evidenceCount = [bosDetected, chochDetected, liquiditySweepDetected, fvgDetected, orderBlockDetected].filter(Boolean).length;
  const directionalAlignment = (bias === "bullish" && latest.close > previous.close) || (bias === "bearish" && latest.close < previous.close);
  const setupReadiness = evidenceCount >= 4 && directionalAlignment
    ? "ready"
    : evidenceCount >= 3 ? "forming" : evidenceCount >= 1 ? "watching" : "no-setup";
  const confidence = Math.round(clamp(40 + evidenceCount * 9 + (directionalAlignment ? 8 : 0) + (recent.length >= 20 ? 7 : 0), 0, 92));
  const changePercent = previous.close === 0 ? null : ((latest.close - previous.close) / previous.close) * 100;
  const warnings = ["Rule-based market structure analysis from verified OHLC data; it is not a trade recommendation."];
  if (setupReadiness === "ready") warnings.push("Review news, risk, and strategy rules before acting on a ready state.");

  return {
    provider: latest.provider,
    symbol: latest.symbol,
    marketType: instrument.marketType,
    timeframe: latest.timeframe,
    lastPrice: latest.close,
    changePercent,
    bias,
    structureState,
    bosDetected,
    chochDetected,
    liquiditySweepDetected,
    fvgDetected,
    orderBlockDetected,
    premiumDiscountState,
    setupReadiness,
    confidence,
    candleCount: ordered.length,
    summary: `${latest.symbol} is ${bias} with ${structureState} structure on ${latest.timeframe}. ${evidenceCount} of 5 structure checks are currently detected from stored OHLC candles.`,
    keyLevels: [
      { label: "20-bar High", value: formatMarketPrice(latest.symbol, rangeHigh) },
      { label: "Equilibrium", value: formatMarketPrice(latest.symbol, midpoint) },
      { label: "20-bar Low", value: formatMarketPrice(latest.symbol, rangeLow) },
    ],
    warnings,
    sourceTime: latest.openedAt,
    fetchedAt: latest.fetchedAt,
    analysisVersion: "market-intelligence-v1",
  };
}
