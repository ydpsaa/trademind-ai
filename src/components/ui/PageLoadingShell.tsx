import { MainContentLoading } from "@/components/layout/MainContentLoading";

interface PageLoadingShellProps {
  variant?: "dashboard" | "table" | "grid" | "form";
}

export function PageLoadingShell({ variant = "grid" }: PageLoadingShellProps) {
  return <MainContentLoading variant={variant} />;
}
