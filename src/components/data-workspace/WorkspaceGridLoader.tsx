"use client";

import dynamic from "next/dynamic";
import { GlassSkeleton } from "@/components/ui/GlassSkeleton";
import type { WorkspaceTable, WorkspaceTableRow } from "@/lib/data-workspace/types";

const WorkspaceGrid = dynamic(
  () => import("@/components/data-workspace/WorkspaceGrid").then((module) => module.WorkspaceGrid),
  { ssr: false, loading: () => <GlassSkeleton className="h-[min(66vh,720px)] min-h-[420px]" /> },
);

interface WorkspaceGridLoaderProps {
  table: WorkspaceTable;
  initialRows: WorkspaceTableRow[];
}

export function WorkspaceGridLoader(props: WorkspaceGridLoaderProps) {
  return <WorkspaceGrid {...props} />;
}
