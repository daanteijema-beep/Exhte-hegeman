import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { EmptyState, ErrorState } from "@/components/brandos/EmptyState";
import { Funnel } from "@/components/brandos/Funnel";
import { fmtInt, fmtDate } from "@/lib/format";
import type {
  KandidaatFunnel,
  KandidaatBron,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecruiteePage() {
  try {
    const [funnelRes, bronnenRes, vacaturesRes, placementsRes] =
      await Promise.all([
        supabaseServer
          .from("v_kandidaten_funnel")
          .select("*")
          .returns<KandidaatFunnel[]>(),
        supabaseServer
          .from("v_kandidaten_bronnen")
          .select("*")
          .order("kandidaten", { ascending: false })
          .returns<KandidaatBron[]>(),
        supabaseServer
          .from("brandos_vacancies")
          .select("id, title, status, published_at")
          .eq("origin", "recruitee")
          .order("published_at", { ascending: false }),
        supabaseServer
          .from("brandos_placements")
          .select("id, candidate_id, vacancy_id, stage, updated_at")
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

    const funnel = funnelRes.data ?? [];
    const bronnen = bronnenRes.data ?? [];
    const vacatures = vacaturesRes.data ?? [];
    const placements = placementsRes.data ?? [];

    // aggregate funnel counts per stage
    const stageCounts: Record<string, number> = {};
    for (const row of funnel) {
      const k = (row.stage ?? "").toLowerCase();
      stageCounts[k] = (stageCounts[k] ?? 0) + Number(row.aantal ?? 0);
    }
    const hasFunnel = Object.values(stageCounts).some((v) => v > 0);

    return (
      <>
        <PageHeader
          title="Recruitee"
          subtitle="Volledige kandidaatfunnel vanuit Recruitee — van sourced tot hired — met herkomst en stage-conversie."
          meta={
            <>
              Vacatures
              <br />
              <span className="text-text">{vacatures.length}</span>
            </>
          }
        />

        <Section
          title="Funnel overzicht"
          subtitle="Alle kandidaten per stage — conversie tussen stappen"
        >
          {hasFunnel ? (
            <Card>
              <Funnel counts={stageCounts} />
            </Card>
          ) : (
            <EmptyState
              title="Geen funnel data"
              message="Recruitee placements zijn nog niet geïngest. Voeg RECRUITEE_API_TOKEN en RECRUITEE_COMPANY_ID toe in Vercel en trigger /api/ingest/recruitee."
              hint="bron: v_kandidaten_funnel"
            />
          )}
        </Section>

        <Section
          title="Herkomst kandidaten"
          subtitle="Welke kanalen leveren kandidaten op"
        >
          {bronnen.length === 0 ? (
            <EmptyState
              title="Nog geen herkomst data"
              message="Komt beschikbaar zodra de eerste Recruitee kandidaten zijn geïngest."
              hint="bron: v_kandidaten_bronnen"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                    <th className="px-3 py-3">Bron</th>
                    <th className="px-3 py-3 text-right">Kandidaten</th>
                    <th className="px-3 py-3 text-right">Actief</th>
                    <th className="px-3 py-3 text-right">Disq.</th>
                    <th className="px-3 py-3">Eerste</th>
                    <th className="px-3 py-3">Laatste</th>
                  </tr>
                </thead>
                <tbody>
                  {bronnen.map((b) => (
                    <tr
                      key={b.herkomst}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <Badge variant="info">{b.herkomst}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {fmtInt(b.kandidaten ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-positive">
                        {fmtInt(b.actief ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-muted">
                        {fmtInt(b.gediskwalificeerd ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-text-dim">
                        {fmtDate(b.eerste)}
                      </td>
                      <td className="px-3 py-2.5 text-text-dim">
                        {fmtDate(b.laatste)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Vacatures in Recruitee"
          subtitle="Alle rollen van origin=recruitee"
        >
          {vacatures.length === 0 ? (
            <EmptyState
              title="Geen Recruitee vacatures"
              message="Trigger /api/ingest/recruitee om vacatures op te halen vanaf company 129883."
              hint="bron: brandos_vacancies"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                    <th className="px-3 py-3">Titel</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Gepubliceerd</th>
                  </tr>
                </thead>
                <tbody>
                  {vacatures.map((v) => (
                    <tr
                      key={v.id as string}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        {v.title as string}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            v.status === "published"
                              ? "positive"
                              : "ghost"
                          }
                        >
                          {(v.status as string) ?? "–"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-text-dim">
                        {fmtDate(v.published_at as string)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Recente activiteit"
          subtitle="Laatste 10 stage-wisselingen (kandidaatnamen geanonimiseerd)"
        >
          {placements.length === 0 ? (
            <EmptyState
              title="Geen activiteit"
              message="Placements verschijnen hier zodra Recruitee kandidaten van stage wisselen."
              hint="bron: brandos_placements"
            />
          ) : (
            <Card>
              <div className="space-y-2">
                {placements.map((p) => (
                  <div
                    key={p.id as string}
                    className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="ghost">
                        {((p.candidate_id as string) ?? "?")
                          .slice(0, 6)
                          .toUpperCase()}
                      </Badge>
                      <span className="text-sm text-text-dim">
                        →
                      </span>
                      <Badge variant="accent">
                        {(p.stage as string) ?? "—"}
                      </Badge>
                    </div>
                    <span className="font-mono text-xs text-text-muted">
                      {fmtDate(p.updated_at as string)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Section>
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
