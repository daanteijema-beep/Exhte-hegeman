import { fmtInt } from "@/lib/format";

const STAGES = [
  { key: "sourced", label: "Sourced" },
  { key: "contacted", label: "Contacted" },
  { key: "screened", label: "Screened" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

export function Funnel({ counts }: { counts: Record<string, number> }) {
  const total = STAGES.reduce(
    (s, st) => s + (counts[st.key] ?? 0),
    0
  );
  const max = Math.max(...STAGES.map((s) => counts[s.key] ?? 0), 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {STAGES.map((st, i) => {
        const v = counts[st.key] ?? 0;
        const prev = i > 0 ? counts[STAGES[i - 1].key] ?? 0 : 0;
        const conv = i > 0 && prev > 0 ? (v / prev) * 100 : null;
        return (
          <div key={st.key} className="flex flex-col items-stretch">
            <div className="relative h-32 overflow-hidden rounded-xl border border-border bg-card">
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent to-accent/30"
                style={{ height: `${(v / max) * 100}%` }}
              />
              <div className="relative z-10 flex h-full flex-col justify-end p-3">
                <div className="font-display text-2xl font-semibold leading-none">
                  {fmtInt(v)}
                </div>
              </div>
            </div>
            <p className="mt-2 truncate font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
              {st.label}
            </p>
            {conv !== null && (
              <p className="font-mono text-[10px] text-text-muted">
                {conv.toFixed(0)}% conv
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
