"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { syncMarketData } from "@/lib/market-data/sync";
import { scannerSymbols, scannerTimeframes, type MarketSymbol, type ScannerTimeframe } from "@/lib/scanner/types";
import { getCurrentUser } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}
export async function syncMarketDataAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/market-scanner");
  if (!isAdminUser(user)) redirect("/market-scanner?sync=denied");

  const symbolValue = value(formData, "symbol") as MarketSymbol;
  const timeframeValue = value(formData, "timeframe") as ScannerTimeframe;
  if (!scannerSymbols.includes(symbolValue) || !scannerTimeframes.includes(timeframeValue)) {
    redirect("/market-scanner?sync=invalid");
  }

  const result = await syncMarketData({ requestedBy: user.id, symbol: symbolValue, timeframe: timeframeValue });
  revalidatePath("/market-scanner");
  revalidatePath(`/market-scanner/${symbolValue}`);
  revalidatePath("/system-status");
  redirect(`/market-scanner?timeframe=${timeframeValue}&sync=${result.ok ? "success" : "error"}&message=${encodeURIComponent(result.message)}`);
}
