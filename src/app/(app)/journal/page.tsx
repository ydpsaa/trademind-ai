import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { JournalControls } from "@/components/journal/JournalControls";
import { JournalStatsCards } from "@/components/journal/JournalStatsCards";
import { JournalTradeTable } from "@/components/journal/JournalTradeTable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { MANUAL_ACCOUNT_VALUE, normalizeSelectedAccount } from "@/lib/accounts/helpers";
import type { TradingAccount } from "@/lib/accounts/types";
import { getPeriodRange, parseJournalPeriod } from "@/lib/trading/periods";
import { calculateTradeStats } from "@/lib/trading/stats";
import type { JournalSource, Trade } from "@/lib/trading/types";
import type { User } from "@supabase/supabase-js";

interface JournalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSource(value: string | string[] | undefined): JournalSource {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "manual" || rawValue === "imported" ? rawValue : "all";
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const period = parseJournalPeriod(params.period);
  const source = parseSource(params.source);
  const range = getPeriodRange(period);
  const supabase = await createSupabaseServerClient();
  let trades: Trade[] = [];
  let accounts: TradingAccount[] = [];
  let error: string | null = null;
  let user: User | null = null;

  if (!supabase) {
    error = "Supabase is not configured.";
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      error = "You must be signed in to view your journal.";
    } else {
      user = userData.user;
      const { data: accountsData } = await supabase
        .from("trading_accounts")
        .select("id,user_id,provider,account_name,account_type,currency,status,metadata,created_at,updated_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: true });
      accounts = (accountsData ?? []) as TradingAccount[];
      const selectedAccount = normalizeSelectedAccount(params.account, accounts);
      let query = supabase
        .from("trades")
        .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at,trade_journal_entries(id,trade_id,user_id,reason_for_entry,emotion_before,emotion_after,screenshot_url,notes_before,notes_after,mistake_tags,setup_tags,created_at,updated_at)")
        .eq("user_id", userData.user.id)
        .gte("opened_at", range.startIso)
        .lte("opened_at", range.endIso)
        .order("opened_at", { ascending: false })
        .limit(250);

      if (source !== "all") {
        query = query.eq("source", source);
      }
      if (selectedAccount === MANUAL_ACCOUNT_VALUE) {
        query = query.eq("source", "manual");
      } else if (selectedAccount !== "all") {
        query = query.eq("trading_account_id", selectedAccount);
      }

      const { data, error: tradesError } = await query;
      if (tradesError) {
        error = formatSupabaseError(tradesError.message);
      } else {
        trades = (data ?? []) as Trade[];
      }
    }
  }

  const stats = calculateTradeStats(trades);
  const selectedAccount = normalizeSelectedAccount(params.account, accounts);

  return (
    <AppShell title="Journal" subtitle="Track your trades, performance, and execution quality." user={user}>
      <div className="space-y-4">
        <JournalControls period={period} source={source} accounts={accounts} selectedAccount={selectedAccount} />
        {params.created ? (
          <GlassCard className="border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            Trade saved successfully.
          </GlassCard>
        ) : null}
        {error ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</GlassCard> : null}
        <JournalStatsCards stats={stats} />
        <JournalTradeTable trades={trades} emptyText={selectedAccount === "all" ? undefined : "No trades found for this account."} />
      </div>
    </AppShell>
  );
}
