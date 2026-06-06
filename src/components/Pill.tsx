import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PillProps = {
  children: ReactNode;
  variant?: "default" | "accent" | "ghost" | "success";
  className?: string;
  title?: string;
};

const VARIANTS: Record<NonNullable<PillProps["variant"]>, string> = {
  default: "bg-surface-2 text-text border border-border",
  accent: "bg-accent/15 text-accent border border-accent/30",
  ghost: "bg-transparent text-muted border border-border",
  success: "bg-like/15 text-like border border-like/30",
};

export default function Pill({
  children,
  variant = "default",
  className,
  title,
}: PillProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
