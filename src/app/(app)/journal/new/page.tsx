import { AppShell } from "@/components/layout/AppShell";
import { AddTradeForm } from "@/components/journal/AddTradeForm";
import type { TradingRule } from "@/lib/rules/types";
import { getActivePropProfileForTrade, getPropContextForProfile } from "@/lib/prop-readiness/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

async function getActiveRules() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rules: [], user: null, propProfile: null, propSnapshot: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { rules: [], user: null, propProfile: null, propSnapshot: null };

  const [rulesResult, propProfile] = await Promise.all([
    supabase
      .from("trading_rules")
      .select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    getActivePropProfileForTrade(supabase, userData.user.id, { source: "manual", trading_account_id: null }),
  ]);
  const propContext = await getPropContextForProfile(supabase, userData.user.id, propProfile);

  if (rulesResult.error) return { rules: [], user: userData.user as User, propProfile: propContext.profile, propSnapshot: propContext.snapshot };
  return { rules: (rulesResult.data ?? []) as TradingRule[], user: userData.user as User, propProfile: propContext.profile, propSnapshot: propContext.snapshot };
}

export default async function NewTradePage() {
  const { rules, user, propProfile, propSnapshot } = await getActiveRules();

  return (
    <AppShell title="Add Trade" subtitle="Save a manual journal trade to your TradeMind workspace." user={user}>
      <AddTradeForm rules={rules} propProfile={propProfile} propSnapshot={propSnapshot} />
    </AppShell>
  );
}
