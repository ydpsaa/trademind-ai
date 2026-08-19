"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { getMarketDataProvider } from "@/lib/market-data/config";
import { getMarketDataSymbols } from "@/lib/market-data/instruments";
import { syncMarketData } from "@/lib/market-data/sync";
import { scannerTimeframes, type MarketSymbol, type ScannerTimeframe } from "@/lib/scanner/types";
import { getCurrentUser } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}
export async function syncMarketDataAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/market-scanner");
  if (!isAdminUser(user)) redirect("/market-scanner?sync=denied");

  const rawSymbol = value(formData, "symbol");
  const timeframeValue = value(formData, "timeframe") as ScannerTimeframe;
  const supportedSymbols = getMarketDataSymbols(getMarketDataProvider());
  if ((rawSymbol !== "all" && !supportedSymbols.includes(rawSymbol as MarketSymbol)) || !scannerTimeframes.includes(timeframeValue)) {
    redirect("/market-scanner?sync=invalid");
  }

  if (rawSymbol === "all") {
    const results = await Promise.all(supportedSymbols.map((symbol) => syncMarketData({
      requestedBy: user.id,
      symbol,
      timeframe: timeframeValue,
    })));
    const completed = results.filter((result) => result.ok).length;
    const message = completed === supportedSymbols.length
      ? `${completed} public markets updated.`
      : `${completed} of ${supportedSymbols.length} public markets updated.`;
    revalidatePath("/market-scanner");
    revalidatePath("/dashboard");
    revalidatePath("/system-status");
    redirect(`/market-scanner?timeframe=${timeframeValue}&sync=${completed ? "success" : "error"}&message=${encodeURIComponent(message)}`);
  }

  const symbolValue = rawSymbol as MarketSymbol;
  const result = await syncMarketData({ requestedBy: user.id, symbol: symbolValue, timeframe: timeframeValue });
  revalidatePath("/market-scanner");
  revalidatePath(`/market-scanner/${symbolValue}`);
  revalidatePath("/dashboard");
  revalidatePath("/system-status");
  redirect(`/market-scanner?timeframe=${timeframeValue}&sync=${result.ok ? "success" : "error"}&message=${encodeURIComponent(result.message)}`);
}
