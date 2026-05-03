import { AppShell } from "@/components/layout/AppShell";
import { StrategyForm } from "@/components/strategies/StrategyForm";

export default function NewStrategyPage() {
  return (
    <AppShell title="New Strategy" subtitle="Define reusable rules for future backtests, signals, and AI context.">
      <StrategyForm mode="create" />
    </AppShell>
  );
}
