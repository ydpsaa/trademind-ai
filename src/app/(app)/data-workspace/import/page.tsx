import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TradeImportWizard } from "@/components/data-workspace/TradeImportWizard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/lib/accounts/types";

export default async function TradeImportPage() {
  const supabase = await createSupabaseServerClient();
  let accounts: TradingAccount[] = [];
  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const result = await supabase.from("trading_accounts").select("id,user_id,provider,account_name,account_type,currency,status,metadata,created_at,updated_at").eq("user_id", userData.user.id).eq("provider", "csv").order("created_at", { ascending: true });
      accounts = (result.data ?? []) as TradingAccount[];
    }
  }
  return <AppShell title="Import Trades" subtitle="Stage, validate, and import real CSV/XLSX trade history."><div className="space-y-4"><Link href="/data-workspace" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Data Workspace</Link><TradeImportWizard accounts={accounts} /></div></AppShell>;
}
