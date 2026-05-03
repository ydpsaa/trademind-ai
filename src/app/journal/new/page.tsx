import { AppShell } from "@/components/layout/AppShell";
import { AddTradeForm } from "@/components/journal/AddTradeForm";

export default function NewTradePage() {
  return (
    <AppShell title="Add Trade" subtitle="Save a manual journal trade to your Supabase workspace.">
      <AddTradeForm />
    </AppShell>
  );
}
