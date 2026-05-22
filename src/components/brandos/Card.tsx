import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card p-5",
        hoverable ? "transition-colors hover:border-border-strong" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
