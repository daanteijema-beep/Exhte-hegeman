import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { EmptyState, ErrorState } from "@/components/brandos/EmptyState";
import { fmtInt, fmtDate, fmtRelative } from "@/lib/format";
import type {
  Competitor,
  CompetitorVacature,
  Insight,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConcurrentiePage() {
  try {
    const [compRes, vacRes, insightsRes] = await Promise.all([
      supabaseServer
        .from("v_competitors")
        .select("*")
        .order("open_vacatures", { ascending: false })
        .returns<Competitor[]>(),
      supabaseServer
        .from("brandos_competitor_vacancies")
        .select(
          "id, competitor, title, location, url, first_seen_at, last_seen_at, is_currently_open"
        )
        .eq("is_currently_open", true)
        .order("first_seen_at", { ascending: false })
        .returns<CompetitorVacature[]>(),
      supabaseServer
        .from("brandos_insights")
        .select("agent, topic, summary, confidence, generated_at")
        .in("topic", ["competitors", "market", "channels", "events"])
        .order("generated_at", { ascending: false })
        .limit(8)
        .returns<Insight[]>(),
    ]);

    const competitors = compRes.data ?? [];
    const vacancies = vacRes.data ?? [];
    const insights = insightsRes.data ?? [];

    return (
      <>
        <PageHeader
          title="Concurrentie & Markt"
          subtitle="Open vacatures bij BAM, Heijmans, Dura Vermeer en AM — plus markt­inzichten van de AI agents."
          meta={
            <>
              Open vacatures
              <br />
              <span className="text-text">
                {fmtInt(
                  competitors.reduce(
                    (s, c) => s + Number(c.open_vacatures ?? 0),
                    0
                  )
                )}
              </span>
            </>
          }
        />

        <Section
          title="Concurrent vergelijking"
          subtitle="Status per concurrent en hun trending vacatures"
        >
          {competitors.length === 0 ? (
            <EmptyState
              title="Geen competitor data"
              message="Competitor scraper heeft nog geen data. Trigger /api/ingest/competitors om te starten."
              hint="bron: v_competitors"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {competitors.map((c) => (
                <Card key={c.short_name} hoverable>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-semibold">
                        {c.formal_name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                        {c.short_name}
                      </p>
                    </div>
                    <Badge variant="accent">
                      {fmtInt(c.open_vacatures ?? 0)}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                      Trending titels
                    </p>
                    {(c.open_titels ?? []).slice(0, 3).map((t, i) => (
                      <p
                        key={i}
                        className="line-clamp-1 text-xs text-text-dim"
                      >
                        · {t}
                      </p>
                    ))}
                    {(c.open_titels?.length ?? 0) === 0 && (
                      <p className="text-xs text-text-muted">
                        nog geen titels gezien
                      </p>
                    )}
                  </div>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    laatste update {fmtRelative(c.laatste_update)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Vacature trends"
          subtitle="Alle openstaande vacatures bij concurrenten"
        >
          {vacancies.length === 0 ? (
            <EmptyState
              title="Geen vacatures"
              message="Geen openstaande concurrent vacatures gezien. Trigger de scraper om opnieuw te kijken."
              hint="bron: brandos_competitor_vacancies"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
                    <th className="px-3 py-3">Concurrent</th>
                    <th className="px-3 py-3">Titel</th>
                    <th className="px-3 py-3">Locatie</th>
                    <th className="px-3 py-3">Gezien sinds</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {vacancies.slice(0, 50).map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <Badge variant="info">{v.competitor}</Badge>
                      </td>
                      <td className="px-3 py-2.5">{v.title}</td>
                      <td className="px-3 py-2.5 text-text-dim">
                        {v.location ?? "–"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-text-dim">
                        {fmtDate(v.first_seen_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {v.url && (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            open →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Marktinzichten"
          subtitle="AI agents schrijven hier hun bevindingen over de markt en concurrenten"
        >
          {insights.length === 0 ? (
            <EmptyState
              title="Nog geen inzichten"
              message="Trigger de onderzoeker of strateeg agent om bevindingen te schrijven."
              hint="bron: brandos_insights (topic in competitors/market/channels/events)"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((it, i) => (
                <Card key={i} hoverable>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="accent">{it.agent}</Badge>
                    {it.topic && (
                      <Badge variant="ghost">{it.topic}</Badge>
                    )}
                    {it.confidence && (
                      <Badge
                        variant={
                          it.confidence === "high"
                            ? "positive"
                            : it.confidence === "medium"
                              ? "info"
                              : "warning"
                        }
                      >
                        {it.confidence}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{it.summary}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    {fmtRelative(it.generated_at)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
