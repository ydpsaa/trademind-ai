"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createWorkspaceTableAction } from "@/app/data-workspace/actions";
import { workspaceTemplates } from "@/lib/data-workspace/templates";
import type { WorkspaceActionResult } from "@/lib/data-workspace/types";

const initialState: WorkspaceActionResult = {};

export function WorkspaceCreateForm() {
  const [state, action, pending] = useActionState(createWorkspaceTableAction, initialState);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Table name</span>
          <input name="name" required maxLength={120} placeholder="London session plan" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none transition focus:border-white/30" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Template</span>
          <select name="template" defaultValue="blank" className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm outline-none focus:border-white/30">
            {workspaceTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Description</span>
        <textarea name="description" rows={4} maxLength={500} placeholder="What this workspace is used for" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none transition focus:border-white/30" />
      </label>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {workspaceTemplates.map((template) => (
          <div key={template.id} className="glass-subtle rounded-xl p-4">
            <div className="text-sm font-medium text-white">{template.name}</div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{template.description}</p>
            <div className="mt-3 text-[11px] text-zinc-600">{template.columns.length} columns</div>
          </div>
        ))}
      </div>
      {state.error ? <p className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</p> : null}
      <button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Create Table
      </button>
    </form>
  );
}
