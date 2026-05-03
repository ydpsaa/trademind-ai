import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}

export function GlassCard({ children, className = "", as: Component = "section" }: GlassCardProps) {
  return <Component className={`glass-panel rounded-2xl ${className}`}>{children}</Component>;
}
