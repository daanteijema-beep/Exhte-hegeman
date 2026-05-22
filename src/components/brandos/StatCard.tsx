import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent,
  alert,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border bg-card p-5 transition-colors",
        accent
          ? "border-accent/30 bg-gradient-to-br from-accent-soft to-card"
          : "border-border hover:border-border-strong",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
          {label}
        </p>
        {alert && (
          <span className="font-mono text-[10px] text-warning">⚠</span>
        )}
      </div>
      <div
        className={[
          "mt-3 font-display text-[42px] font-semibold leading-none tracking-tight",
          alert ? "text-warning" : "",
        ].join(" ")}
      >
        {value}
      </div>
      {hint && (
        <p className="mt-2 text-xs text-text-dim">{hint}</p>
      )}
    </div>
  );
}
