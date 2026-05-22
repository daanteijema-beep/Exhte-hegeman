"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import { Sparkline } from "./Sparkline";
import type { Vacature } from "@/lib/supabase/types";
import type { UrgencyResult } from "@/lib/brandos/urgency";

export function UrgencyCard({
  vacature,
  urgency,
  spark,
}: {
  vacature: Vacature;
  urgency: UrgencyResult;
  spark: number[];
}) {
  const [open, setOpen] = useState(false);
  const v = vacature;
  const variant =
    urgency.score >= 70 ? "negative" : urgency.score >= 50 ? "warning" : "neutral";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-card-hover">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{v.title}</h3>
          <p className="mt-0.5 truncate text-xs text-text-dim">
            {v.location ?? "–"} {v.department ? `· ${v.department}` : ""}
          </p>
        </div>
        <Badge variant={variant}>{urgency.score}</Badge>
      </div>
      <p className="mb-3 line-clamp-2 text-sm text-text-dim">
        {urgency.reasons.length > 0 ? urgency.reasons.join(" · ") : "Aandacht: gemengde signalen"}
      </p>
      {spark.length > 0 && <Sparkline values={spark} width={240} height={36} />}
      <div className="mt-3 flex justify-between text-xs">
        <button onClick={() => setOpen((o) => !o)} className="text-accent hover:underline">
          {open ? "verberg details" : "toon details →"}
        </button>
        {v.url && (
          <a href={v.url} target="_blank" rel="noreferrer" className="text-text-dim hover:text-text">
            open vacature ↗
          </a>
        )}
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <Inline label="dagen online" value={`${v.dagen_online ?? "–"}`} />
          <Inline label="pageviews 14d" value={`${v.pv_last_14d ?? 0}`} />
          <Inline label="apps" value={`${v.wz_applications ?? 0}`} />
          <Inline
            label="trend"
            value={
              v.trend_pct_14d != null
                ? `${v.trend_pct_14d > 0 ? "+" : ""}${v.trend_pct_14d}%`
                : "–"
            }
          />
        </div>
      )}
    </div>
  );
}

function Inline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-0.5">
      <span className="text-text-dim">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
