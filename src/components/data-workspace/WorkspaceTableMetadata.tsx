"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Pencil, X } from "lucide-react";
import { updateWorkspaceTableAction } from "@/app/data-workspace/actions";
import type { WorkspaceTable } from "@/lib/data-workspace/types";

interface WorkspaceTableMetadataProps {
  table: WorkspaceTable;
}

export function WorkspaceTableMetadata({ table }: WorkspaceTableMetadataProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateWorkspaceTableAction(table.id, name, description);
      if (!result.success) return setError(result.error ?? "Unable to update table.");
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return <button onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 transition hover:text-white"><Pencil className="h-3.5 w-3.5" />Edit details</button>;
  }

  return (
    <div className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
      <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} aria-label="Workspace name" className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-xs" />
      <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} aria-label="Workspace description" placeholder="Description" className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-xs" />
      <div className="flex gap-1"><button onClick={save} disabled={pending} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-black" aria-label="Save table details">{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button><button onClick={() => setEditing(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10" aria-label="Cancel editing"><X className="h-3.5 w-3.5" /></button></div>
      {error ? <p className="text-xs text-rose-300 sm:col-span-3">{error}</p> : null}
    </div>
  );
}
