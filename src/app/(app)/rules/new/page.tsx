import { AppShell } from "@/components/layout/AppShell";
import { RuleForm } from "@/components/rules/RuleForm";

export default function NewRulePage() {
  return (
    <AppShell title="Create Rule" subtitle="Add a manual or automatic pre-trade checklist rule.">
      <RuleForm />
    </AppShell>
  );
}
