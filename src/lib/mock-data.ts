export const metricCards = [
  { label: "Total Balance", value: "$24,780.45", delta: "+2.45% today", positive: true },
  { label: "Daily PnL", value: "+$1,250.75", delta: "+2.45%", positive: true },
  { label: "Win Rate", value: "67.3%", delta: "+4.21%", positive: true },
  { label: "Profit Factor", value: "1.84", delta: "+0.35", positive: true },
  { label: "Max Drawdown", value: "8.42%", delta: "-1.21%", positive: false },
];

export const equityCurve = {
  value: "$24,780.45",
  delta: "+11.42% (7D)",
  labels: ["May 12", "May 13", "May 14", "May 15", "May 16", "May 17", "May 18", "May 19"],
  yAxis: ["27K", "24K", "21K", "18K", "15K"],
};

export const markets = [
  { symbol: "XAUUSD", name: "Gold", price: "2,378.65", move: "+0.64%", bias: "Bullish" },
  { symbol: "EURUSD", name: "Euro / U.S. Dollar", price: "1.0887", move: "-0.12%", bias: "Neutral" },
  { symbol: "NAS100", name: "US 100 Index", price: "18,732.6", move: "+0.72%", bias: "Bullish" },
  { symbol: "US30", name: "Dow Jones 30", price: "39,753.4", move: "+0.35%", bias: "Bullish" },
  { symbol: "BTCUSDT", name: "Bitcoin / Tether", price: "66,521.8", move: "+1.35%", bias: "Breakout" },
];

export const recentTrades = [
  { symbol: "XAUUSD", direction: "Long", result: "Win", pnl: "+$562.50", rr: "1:2.4", date: "May 19" },
  { symbol: "EURUSD", direction: "Short", result: "Win", pnl: "+$320.10", rr: "1:1.8", date: "May 19" },
  { symbol: "NAS100", direction: "Long", result: "Loss", pnl: "-$185.20", rr: "1:1", date: "May 18" },
  { symbol: "BTCUSDT", direction: "Long", result: "Win", pnl: "+$750.00", rr: "1:2.7", date: "May 18" },
  { symbol: "US30", direction: "Short", result: "Win", pnl: "+$410.30", rr: "1:2.1", date: "May 17" },
];

export const aiReview = {
  symbol: "XAUUSD",
  direction: "Long",
  score: 85,
  timestamp: "May 19, 2024 - 15:30",
  checklist: ["Market Structure", "Liquidity", "ICT / Smart Money", "Risk Management", "News Impact"],
  analysis: "This is a high quality trade. You waited for BOS confirmation and entered on a valid FVG retest in discount zone.",
  wins: ["Waited for BOS confirmation", "Entered in discount zone", "Good risk management", "High probability setup"],
  improvements: "Could have waited for a lower timeframe confirmation for a cleaner entry.",
};

export const economicEvents = [
  { time: "14:30", currency: "USD", event: "CPI m/m", impact: "High", date: "May 19" },
  { time: "16:00", currency: "USD", event: "FOMC Member Speaks", impact: "Medium", date: "May 20" },
  { time: "19:00", currency: "USD", event: "Federal Budget Balance", impact: "High", date: "May 21" },
  { time: "15:30", currency: "USD", event: "Initial Jobless Claims", impact: "Medium", date: "May 22" },
];

export const backtestSummary = {
  strategy: "ICT London Kill Zone",
  symbol: "XAUUSD",
  timeframe: "15m",
  period: "01/01 - 05/19",
  stats: [
    ["Total Trades", "86"],
    ["Win Rate", "69.8%"],
    ["Profit Factor", "1.97"],
    ["Max Drawdown", "7.21%"],
  ],
};

export const performanceSummary = {
  winRate: 67.3,
  stats: [
    ["Total Trades", "142"],
    ["Winning Trades", "95"],
    ["Losing Trades", "47"],
    ["Breakeven", "5"],
  ],
};

export const strategies = [
  { name: "ICT London Kill Zone", winRate: "69.8%", trades: 86, status: "Active" },
  { name: "BOS + FVG Continuation", winRate: "64.1%", trades: 54, status: "Testing" },
  { name: "Liquidity Sweep Reversal", winRate: "61.7%", trades: 41, status: "Draft" },
];

export const signals = [
  { symbol: "XAUUSD", direction: "Long", confidence: "82%", reasoning: "BOS confirmed with discount FVG retest." },
  { symbol: "NAS100", direction: "Long", confidence: "74%", reasoning: "Trend continuation above prior session high." },
  { symbol: "EURUSD", direction: "Short", confidence: "68%", reasoning: "Liquidity sweep into premium resistance." },
];

export const connections = ["Supabase", "Grok / xAI", "Bybit", "OKX", "MetaTrader later", "Market Data API"];
