import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StrategyForm } from "@/components/strategies/StrategyForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Strategy } from "@/lib/strategies/types";
import type { User } from "@supabase/supabase-js";

interface EditStrategyPageProps {
  params: Promise<{ strategyId: string }>;
}

async function getStrategy(strategyId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("strategies")
    .select("id,user_id,name,description,rules_json,is_active,created_at,updated_at")
    .eq("id", strategyId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) return null;
  return { strategy: data as Strategy, user: userData.user as User };
}

export default async function EditStrategyPage({ params }: EditStrategyPageProps) {
  const { strategyId } = await params;
  const context = await getStrategy(strategyId);

  if (!context) {
    notFound();
  }

  const { strategy, user } = context;
  return (
    <AppShell title="Edit Strategy" subtitle="Update the rules and risk constraints for this playbook." user={user}>
      <StrategyForm mode="edit" strategy={strategy} />
    </AppShell>
  );
}
