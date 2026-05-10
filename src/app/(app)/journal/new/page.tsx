import { AppShell } from "@/components/layout/AppShell";
import { AddTradeForm } from "@/components/journal/AddTradeForm";
import type { TradingRule } from "@/lib/rules/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

async function getActiveRules() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rules: [], user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { rules: [], user: null };

  const { data, error } = await supabase
    .from("trading_rules")
    .select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at")
    .eq("user_id", userData.user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) return { rules: [], user: userData.user as User };
  return { rules: (data ?? []) as TradingRule[], user: userData.user as User };
}

export default async function NewTradePage() {
  const { rules, user } = await getActiveRules();

  return (
    <AppShell title="Add Trade" subtitle="Save a manual journal trade to your Supabase workspace." user={user}>
      <AddTradeForm rules={rules} />
    </AppShell>
  );
}
