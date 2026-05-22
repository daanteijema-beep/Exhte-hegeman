"use client";

import { useMemo, useState } from "react";
import { VacatureRow } from "./VacatureRow";
import { EmptyState } from "./EmptyState";
import type { Vacature, WerkzoekenTijdreeks } from "@/lib/supabase/types";

type StatusFilter = "all" | "active" | "archived";
type OriginFilter = "all" | "recruitee" | "werkzoeken" | "website";
type SortKey = "newest" | "oldest" | "clicks" | "longest";

export function VacaturesTable({
  vacatures,
  tijdreeks,
}: {
  vacatures: Vacature[];
  tijdreeks: WerkzoekenTijdreeks[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    let arr = [...vacatures];
    if (status === "active")
      arr = arr.filter((v) => v.status === "published");
    if (status === "archived")
      arr = arr.filter(
        (v) => v.status === "archived" || v.status === "closed"
      );
    if (origin !== "all") arr = arr.filter((v) => v.origin === origin);
    if (sort === "newest")
      arr.sort(
        (a, b) =>
          (b.published_at ?? "").localeCompare(a.published_at ?? "")
      );
    if (sort === "oldest")
      arr.sort(
        (a, b) =>
          (a.published_at ?? "").localeCompare(b.published_at ?? "")
      );
    if (sort === "clicks")
      arr.sort((a, b) => (b.wz_clicks ?? 0) - (a.wz_clicks ?? 0));
    if (sort === "longest")
      arr.sort((a, b) => (b.dagen_open ?? 0) - (a.dagen_open ?? 0));
    return arr;
  }, [vacatures, status, origin, sort]);

  if (vacatures.length === 0) {
    return (
      <EmptyState
        title="Geen vacatures geïngest"
        message="Trigger /api/ingest/recruitee en /api/ingest/werkzoeken via de Bedrijf pagina, of voeg de API tokens toe in Vercel env vars."
        hint="bron: v_vacatures"
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          value={status}
          options={[
            ["all", "Alle"],
            ["active", "Actief"],
            ["archived", "Gearchiveerd"],
          ]}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
        <FilterGroup
          label="Bron"
          value={origin}
          options={[
            ["all", "Alle"],
            ["recruitee", "Recruitee"],
            ["werkzoeken", "Werkzoeken"],
            ["website", "Website"],
          ]}
          onChange={(v) => setOrigin(v as OriginFilter)}
        />
        <FilterGroup
          label="Sorteer"
          value={sort}
          options={[
            ["newest", "Nieuwste"],
            ["oldest", "Oudste"],
            ["clicks", "Meeste clicks"],
            ["longest", "Langst open"],
          ]}
          onChange={(v) => setSort(v as SortKey)}
        />
        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-text-dim">
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
              <th className="px-3 py-3">Bron</th>
              <th className="px-3 py-3">Open</th>
              <th className="px-3 py-3 text-right">WZ clicks</th>
              <th className="px-3 py-3 text-right">WZ sollic.</th>
              <th className="px-3 py-3 text-right">RC kandid.</th>
              <th className="px-3 py-3 text-right">Salaris</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <VacatureRow key={v.id} vacature={v} tijdreeks={tijdreeks} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1">
      <span className="px-2 font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
        {label}
      </span>
      {options.map(([key, lbl]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={[
            "rounded-full px-3 py-1 text-xs transition-colors",
            value === key
              ? "bg-accent-soft text-accent"
              : "text-text-dim hover:text-text",
          ].join(" ")}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
