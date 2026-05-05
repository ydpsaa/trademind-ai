import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RuleForm } from "@/components/rules/RuleForm";
import type { TradingRule } from "@/lib/rules/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface EditRulePageProps {
  params: Promise<{ ruleId: string }>;
}

export default async function EditRulePage({ params }: EditRulePageProps) {
  const { ruleId } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) notFound();

  const { data, error } = await supabase
    .from("trading_rules")
    .select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at")
    .eq("id", ruleId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) notFound();

  return (
    <AppShell title="Edit Rule" subtitle="Update pre-trade checklist logic." user={userData.user}>
      <RuleForm rule={data as TradingRule} />
    </AppShell>
  );
}
