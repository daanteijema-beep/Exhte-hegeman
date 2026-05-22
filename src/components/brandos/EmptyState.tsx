export function EmptyState({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border bg-card/30 px-6 py-10">
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="max-w-prose text-sm text-text-dim">{message}</p>
      {hint && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-negative/30 bg-negative/5 px-6 py-10">
      <p className="font-display text-base font-semibold text-negative">
        Kon data niet laden
      </p>
      <p className="mt-1 text-sm text-text-dim">{message}</p>
    </div>
  );
}
