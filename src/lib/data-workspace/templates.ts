import type { WorkspaceColumn } from "@/lib/data-workspace/types";

export type WorkspaceTemplateId = "blank" | "trade-plan" | "research-log" | "risk-tracker";

export interface WorkspaceTemplate {
  id: WorkspaceTemplateId;
  name: string;
  description: string;
  columns: WorkspaceColumn[];
}

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    id: "blank",
    name: "Blank Table",
    description: "Start with a lightweight table and shape it around your workflow.",
    columns: [
      { key: "name", name: "Name", type: "text", width: 220 },
      { key: "status", name: "Status", type: "select", width: 150, options: ["Not started", "In progress", "Done"] },
      { key: "notes", name: "Notes", type: "text", width: 320 },
    ],
  },
  {
    id: "trade-plan",
    name: "Trade Plan",
    description: "Plan symbols, directional bias, risk, and execution criteria.",
    columns: [
      { key: "symbol", name: "Symbol", type: "text", width: 130 },
      { key: "bias", name: "Bias", type: "select", width: 130, options: ["Bullish", "Bearish", "Neutral"] },
      { key: "setup", name: "Setup", type: "text", width: 240 },
      { key: "risk", name: "Risk %", type: "percent", width: 110 },
      { key: "entry_criteria", name: "Entry Criteria", type: "text", width: 320 },
      { key: "status", name: "Status", type: "select", width: 130, options: ["Watching", "Ready", "Invalid"] },
    ],
  },
  {
    id: "research-log",
    name: "Research Log",
    description: "Organize market observations, sources, and conclusions.",
    columns: [
      { key: "date", name: "Date", type: "date", width: 140 },
      { key: "topic", name: "Topic", type: "text", width: 220 },
      { key: "market", name: "Market", type: "text", width: 140 },
      { key: "source", name: "Source", type: "url", width: 260 },
      { key: "observation", name: "Observation", type: "text", width: 360 },
      { key: "reviewed", name: "Reviewed", type: "checkbox", width: 110 },
    ],
  },
  {
    id: "risk-tracker",
    name: "Risk Tracker",
    description: "Track daily limits, realized exposure, and discipline notes.",
    columns: [
      { key: "date", name: "Date", type: "date", width: 140 },
      { key: "account", name: "Account", type: "text", width: 180 },
      { key: "max_risk", name: "Max Risk %", type: "percent", width: 130 },
      { key: "used_risk", name: "Used Risk %", type: "percent", width: 130 },
      { key: "daily_pnl", name: "Daily PnL", type: "currency", width: 140 },
      { key: "within_limit", name: "Within Limit", type: "checkbox", width: 120 },
      { key: "notes", name: "Notes", type: "text", width: 320 },
    ],
  },
];

export function getWorkspaceTemplate(value: string | null | undefined) {
  return workspaceTemplates.find((template) => template.id === value) ?? workspaceTemplates[0];
}
