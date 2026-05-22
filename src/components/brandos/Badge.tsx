import type { ReactNode } from "react";

type Variant =
  | "neutral"
  | "accent"
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "ghost";

const STYLES: Record<Variant, string> = {
  neutral: "bg-card-hover text-text border-border",
  accent: "bg-accent-soft text-accent border-accent/20",
  positive: "bg-positive/10 text-positive border-positive/20",
  negative: "bg-negative/10 text-negative border-negative/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/30",
  ghost: "bg-transparent text-text-dim border-border",
};

export function Badge({
  variant = "neutral",
  children,
  className = "",
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider",
        STYLES[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
