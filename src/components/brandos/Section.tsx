import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[13px] text-text-dim">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle: string;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6 border-b border-border pb-6">
      <div>
        <h1 className="font-display text-[34px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-text-dim">{subtitle}</p>
      </div>
      {meta && (
        <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          {meta}
        </div>
      )}
    </div>
  );
}
