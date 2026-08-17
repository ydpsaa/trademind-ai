import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { WorkspaceCreateForm } from "@/components/data-workspace/WorkspaceCreateForm";

export default function NewWorkspaceTablePage() {
  return <AppShell title="New Table" subtitle="Create a structured table for your trading workflow."><div className="space-y-4"><Link href="/data-workspace" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Data Workspace</Link><GlassCard className="p-5 sm:p-6"><div className="mb-6"><h1 className="text-2xl font-semibold">New Custom Table</h1><p className="mt-2 text-sm text-zinc-500">Choose a starting structure. Columns and rows remain fully editable.</p></div><WorkspaceCreateForm /></GlassCard></div></AppShell>;
}
