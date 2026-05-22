"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { VacatureRow } from "./VacatureRow";
import { EmptyState } from "./EmptyState";
import type { Vacature, WerkzoekenTijdreeks } from "@/lib/supabase/types";
import { computeUrgency } from "@/lib/brandos/urgency";

export function VacaturesTable({
  vacatures,
  tijdreeks,
}: {
  vacatures: Vacature[];
  tijdreeks: WerkzoekenTijdreeks[];
}) {
  const params = useSearchParams();
  const deptFilter = params.getAll("dept");
  const locFilter = params.getAll("loc");
  const empFilter = params.getAll("emp");
  const q = params.get("q")?.toLowerCase() ?? "";

  const filtered = useMemo(() => {
    let arr = vacatures.filter((v) => v.status === "published");
    if (deptFilter.length)
      arr = arr.filter((v) => v.department && deptFilter.includes(v.department));
    if (locFilter.length)
      arr = arr.filter((v) => v.location && locFilter.includes(v.location));
    if (empFilter.length)
      arr = arr.filter(
        (v) => v.employment_type && empFilter.includes(v.employment_type)
      );
    if (q) arr = arr.filter((v) => v.title.toLowerCase().includes(q));
    arr.sort((a, b) =>
      (b.web_last_seen ?? "").localeCompare(a.web_last_seen ?? "")
    );
    return arr;
  }, [vacatures, deptFilter, locFilter, empFilter, q]);

  if (vacatures.length === 0) {
    return (
      <EmptyState
        title="Geen vacatures geïngest"
        message="Trigger /api/ingest/recruitee en /api/ingest/werkzoeken via de Bedrijf pagina, of voeg de API tokens toe in Vercel env vars."
        hint="bron: v_vacatures_with_urgency"
      />
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
          Alle vacatures
        </p>
        <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
          {filtered.length} / {vacatures.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
              <th className="px-3 py-3">Titel</th>
              <th className="px-3 py-3">Locatie</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Open</th>
              <th className="px-3 py-3 text-right">Web views</th>
              <th className="px-3 py-3 text-right">WZ clicks</th>
              <th className="px-3 py-3 text-right">WZ sollic.</th>
              <th className="px-3 py-3 text-right">RC kandid.</th>
              <th className="px-3 py-3 text-right">Salaris</th>
              <th className="px-3 py-3 text-right">Urgentie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const urgency = computeUrgency({
                dagen_online: v.dagen_online,
                web_pageviews: v.web_pageviews,
                wz_applications: v.wz_applications,
                pv_last_14d: v.pv_last_14d,
                pv_prev_14d: v.pv_prev_14d,
                salary_min: v.salary_min,
                description_length: v.description_length,
              });
              return (
                <VacatureRow
                  key={v.id}
                  vacature={v}
                  tijdreeks={tijdreeks}
                  urgency={urgency}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
