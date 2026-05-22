import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { ErrorState } from "@/components/brandos/EmptyState";
import { IngestButton } from "@/components/brandos/IngestButton";
import { InstructionEditor } from "@/components/brandos/InstructionEditor";
import { fmtRelative, fmtInt } from "@/lib/format";
import type {
  BrandosSource,
  IngestionRun,
  AgentInstruction,
  ApiEndpoint,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INGEST_MAP: Record<string, string> = {
  werkzoeken_vacancies: "/api/ingest/werkzoeken",
  werkzoeken_clicks: "/api/ingest/werkzoeken",
  recruitee_offers: "/api/ingest/recruitee",
  recruitee_candidates: "/api/ingest/recruitee",
  recruitee_placements: "/api/ingest/recruitee",
  competitors_dura: "/api/ingest/competitors",
  competitors_heijmans: "/api/ingest/competitors",
  competitors_bam: "/api/ingest/competitors",
};

export default async function BedrijfPage() {
  try {
    const [sourcesRes, runsRes, instrRes, endpointsRes] = await Promise.all([
      supabaseServer
        .from("brandos_sources")
        .select("*")
        .order("kind"),
      supabaseServer
        .from("brandos_ingestion_runs")
        .select("source_id, status, finished_at, rows_upserted")
        .order("finished_at", { ascending: false })
        .limit(200),
      supabaseServer
        .from("agent_instructions")
        .select("*")
        .order("scope"),
      supabaseServer
        .from("api_endpoints")
        .select("id, method, path, description, category, enabled")
        .order("category"),
    ]);

    const sources = (sourcesRes.data ?? []) as BrandosSource[];
    const runs = (runsRes.data ?? []) as IngestionRun[];
    const instructions = (instrRes.data ?? []) as AgentInstruction[];
    const endpoints = (endpointsRes.data ?? []) as ApiEndpoint[];

    // last successful run per source
    const lastRunBySource = new Map<string, IngestionRun>();
    for (const r of runs) {
      if (r.status !== "success") continue;
      if (!lastRunBySource.has(r.source_id))
        lastRunBySource.set(r.source_id, r);
    }

    // group endpoints by category
    const groupedEp = endpoints.reduce<Record<string, ApiEndpoint[]>>(
      (acc, e) => {
        (acc[e.category] ??= []).push(e);
        return acc;
      },
      {}
    );

    return (
      <>
        <PageHeader
          title="Bedrijf & systeem"
          subtitle="Bronnen, agent-instructies en het registry van endpoints — de plek waar je ingests triggert en context onderhoudt."
          meta={
            <>
              Supabase
              <br />
              <span className="text-text">vttmtslwqrpwqxjnenso</span>
            </>
          }
        />

        <Section
          title="Databronnen"
          subtitle="Status en laatste succesvolle ingest per bron"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                  <th className="px-3 py-3">Bron</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Laatste ingest</th>
                  <th className="px-3 py-3 text-right">Rows</th>
                  <th className="px-3 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const lastRun = lastRunBySource.get(s.id);
                  const endpoint = INGEST_MAP[s.id];
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{s.label}</p>
                        <p className="font-mono text-[10px] text-text-muted">
                          {s.id}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="ghost">{s.kind}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            s.status === "active"
                              ? "positive"
                              : s.status === "error"
                                ? "negative"
                                : "ghost"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-text-dim">
                        {fmtRelative(lastRun?.finished_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {fmtInt(lastRun?.rows_upserted ?? 0)}
                      </td>
                      <td className="px-3 py-2.5">
                        {endpoint ? (
                          <IngestButton endpoint={endpoint} />
                        ) : (
                          <span className="font-mono text-[10px] text-text-muted">
                            geen route
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Agent instructies"
          subtitle="Context voor de Claude agents — klik om te editen, Cmd+S om op te slaan"
        >
          <InstructionEditor instructions={instructions} />
        </Section>

        <Section
          title="Endpoints registry"
          subtitle="API routes die door agents aangeroepen kunnen worden"
        >
          <div className="space-y-5">
            {Object.entries(groupedEp).map(([cat, eps]) => (
              <div key={cat}>
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                  {cat}
                </p>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {eps.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0"
                    >
                      <Badge
                        variant={e.method === "GET" ? "info" : "accent"}
                      >
                        {e.method}
                      </Badge>
                      <code className="font-mono text-xs text-text">
                        {e.path}
                      </code>
                      <span className="text-xs text-text-dim">
                        {e.description}
                      </span>
                      <span
                        className={[
                          "ml-auto font-mono text-[10px] uppercase tracking-wider",
                          e.enabled ? "text-positive" : "text-text-muted",
                        ].join(" ")}
                      >
                        {e.enabled ? "● enabled" : "○ disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Bedrijfscontext"
          subtitle="Vaste info over het bedrijf en de stack"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                Bedrijf
              </p>
              <p className="mt-2 font-display text-lg font-semibold">
                Hegeman Bouw & Infra
              </p>
              <p className="mt-1 text-sm text-text-dim">
                Onderdeel van Heijmans (dec 2025)
              </p>
              <p className="mt-3 text-xs text-text-muted">
                Recruiter: Daan Teijema
              </p>
            </Card>
            <Card>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                Stack
              </p>
              <ul className="mt-2 space-y-1 text-sm text-text-dim">
                <li>
                  Supabase project:{" "}
                  <code className="text-text">vttmtslwqrpwqxjnenso</code>
                </li>
                <li>
                  Vercel project:{" "}
                  <code className="text-text">hegeman-brandos</code>
                </li>
                <li>
                  Next.js 15 · App Router · React Server Components
                </li>
                <li>Tailwind v4 · Syne + DM Mono</li>
              </ul>
            </Card>
          </div>
        </Section>
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
