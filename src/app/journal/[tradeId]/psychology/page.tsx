import { notFound } from "next/navigation";
import { PsychologyForm } from "@/components/journal/PsychologyForm";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TradePsychology } from "@/lib/psychology/types";

interface PsychologyPageProps {
  params: Promise<{ tradeId: string }>;
}

export default async function TradePsychologyPage({ params }: PsychologyPageProps) {
  const { tradeId } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) notFound();

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .select("id, symbol")
    .eq("id", tradeId)
    .eq("user_id", userData.user.id)
    .single();

  if (tradeError || !trade) notFound();

  const { data: psychology } = await supabase
    .from("trade_psychology")
    .select("id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at")
    .eq("trade_id", tradeId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return (
    <AppShell title={`${trade.symbol} Psychology`} subtitle="Add or update behavioral context for this trade." user={userData.user}>
      <PsychologyForm tradeId={tradeId} psychology={(psychology ?? null) as TradePsychology | null} />
    </AppShell>
  );
}
