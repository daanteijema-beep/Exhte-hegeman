"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import { Sparkline } from "./Sparkline";
import { fmtInt, fmtEur, fmtDate } from "@/lib/format";
import type { Vacature, WerkzoekenTijdreeks } from "@/lib/supabase/types";

function statusBadge(status: string | null) {
  if (status === "published")
    return <Badge variant="positive">Actief</Badge>;
  if (status === "archived" || status === "closed")
    return <Badge variant="ghost">Gearchiveerd</Badge>;
  if (status === "internal") return <Badge variant="info">Intern</Badge>;
  return <Badge variant="neutral">{status ?? "–"}</Badge>;
}

function dagenBadge(d: number | null) {
  if (d === null) return null;
  if (d > 90) return <Badge variant="negative">🔴 {d}d</Badge>;
  if (d > 60) return <Badge variant="warning">⚠ {d}d</Badge>;
  return <span className="font-mono text-sm text-text-dim">{d}d</span>;
}

function salaris(v: Vacature) {
  if (!v.salary_min && !v.salary_max) return "–";
  if (v.salary_min && v.salary_max && v.salary_min !== v.salary_max) {
    return `${fmtEur(v.salary_min)} – ${fmtEur(v.salary_max)}`;
  }
  return fmtEur(v.salary_max ?? v.salary_min ?? 0);
}

export function VacatureRow({
  vacature,
  tijdreeks,
}: {
  vacature: Vacature;
  tijdreeks: WerkzoekenTijdreeks[];
}) {
  const [open, setOpen] = useState(false);
  const v = vacature;
  const sparkValues = tijdreeks
    .filter((t) => t.vacancy_id === v.id)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .slice(-30)
    .map((t) => Number(t.clicks ?? 0));

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer border-b border-border transition-colors hover:bg-card-hover"
      >
        <td className="py-3 pr-3">
          <div className="font-medium">{v.title}</div>
          {v.department && (
            <div className="mt-0.5 text-xs text-text-dim">{v.department}</div>
          )}
        </td>
        <td className="py-3 pr-3 text-sm text-text-dim">{v.location ?? "–"}</td>
        <td className="py-3 pr-3">{statusBadge(v.status)}</td>
        <td className="py-3 pr-3">
          <Badge variant="ghost">{v.origin}</Badge>
        </td>
        <td className="py-3 pr-3">{dagenBadge(v.dagen_open)}</td>
        <td className="py-3 pr-3 text-right font-mono text-sm">
          {fmtInt(v.wz_clicks ?? 0)}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm">
          {fmtInt(v.wz_applications ?? 0)}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm">
          {fmtInt(v.rc_placements ?? 0)}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm">{salaris(v)}</td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-card/50">
          <td colSpan={9} className="px-4 py-5">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                  Werkzoeken clicks · laatste 30 dagen
                </p>
                <div className="mt-3">
                  {sparkValues.length > 0 ? (
                    <Sparkline values={sparkValues} width={240} height={48} />
                  ) : (
                    <span className="text-xs text-text-muted">
                      geen Werkzoeken data
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Inline
                    label="clicks"
                    value={fmtInt(v.wz_clicks ?? 0)}
                  />
                  <Inline
                    label="sollicitaties"
                    value={fmtInt(v.wz_applications ?? 0)}
                  />
                  <Inline
                    label="gem. positie"
                    value={
                      v.wz_avg_position
                        ? v.wz_avg_position.toFixed(1)
                        : "–"
                    }
                  />
                </div>
              </div>

              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                  Recruitee kandidaten
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Inline
                    label="placements"
                    value={fmtInt(v.rc_placements ?? 0)}
                  />
                  <Inline
                    label="qualified"
                    value={fmtInt(v.rc_qualified ?? 0)}
                  />
                </div>
              </div>

              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                  Details
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <Inline
                    label="gepubliceerd"
                    value={fmtDate(v.published_at)}
                  />
                  <Inline
                    label="employment"
                    value={v.employment_type ?? "–"}
                  />
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-accent hover:underline"
                    >
                      Open vacature →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
