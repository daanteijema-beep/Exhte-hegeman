import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { StatCard } from "@/components/brandos/StatCard";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { EmptyState, ErrorState } from "@/components/brandos/EmptyState";
import { fmtInt, fmtEur, fmtPct, fmtRelative, fmtDate } from "@/lib/format";
import type { DashboardStats, Insight } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const [statsRes, insightsRes] = await Promise.all([
      supabaseServer
        .from("v_dashboard_stats")
        .select("*")
        .maybeSingle<DashboardStats>(),
      supabaseServer
        .from("brandos_insights")
        .select("agent, topic, summary, confidence, generated_at")
        .order("generated_at", { ascending: false })
        .limit(3)
        .returns<Insight[]>(),
    ]);

    const stats = statsRes.data;
    const insights = insightsRes.data ?? [];

    return (
      <>
        <PageHeader
          title="Employer brand intelligence"
          subtitle="Realtime beeld van vacatures, kandidaten, advertenties en social — gevoed door Recruitee, Werkzoeken, Meta Ads en Windsor."
          meta={
            <>
              Laatste ingest
              <br />
              <span className="text-text">
                {stats?.laatste_succesvolle_ingest
                  ? fmtDate(stats.laatste_succesvolle_ingest)
                  : "nog geen"}
              </span>
            </>
          }
        />

        <Section
          title="Kernindicatoren"
          subtitle="Stand van zaken over alle bronnen heen"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Actieve vacatures"
              value={fmtInt(stats?.actieve_vacatures ?? 0)}
              hint="gepubliceerd in Recruitee + Werkzoeken"
              accent
            />
            <StatCard
              label="Lang open >60d"
              value={fmtInt(stats?.vacatures_lang_open ?? 0)}
              hint="aandachtspunt — vraagt review"
              alert={(stats?.vacatures_lang_open ?? 0) > 0}
            />
            <StatCard
              label="Totaal kandidaten"
              value={fmtInt(stats?.totaal_kandidaten ?? 0)}
              hint="alle bronnen in Recruitee"
            />
            <StatCard
              label="Competitor vacatures"
              value={fmtInt(stats?.competitor_open_vacatures ?? 0)}
              hint="BAM, Heijmans, Dura Vermeer"
            />
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-2">
          <Section
            title="Advertenties · 30 dagen"
            subtitle="Meta Ads spend en engagement"
          >
            <Card>
              <div className="grid grid-cols-3 gap-4">
                <Metric
                  label="Spend"
                  value={fmtEur(stats?.ads_spend_30d ?? 0)}
                />
                <Metric
                  label="Gem. CTR"
                  value={fmtPct(stats?.gem_ctr_30d ?? 0, 2)}
                />
                <Metric
                  label="Active placements"
                  value={fmtInt(stats?.actieve_placements ?? 0)}
                />
              </div>
            </Card>
          </Section>

          <Section
            title="Organic social · 30 dagen"
            subtitle="Instagram + Facebook prestaties"
          >
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <Metric
                  label="Posts"
                  value={fmtInt(stats?.posts_afgelopen_30d ?? 0)}
                />
                <Metric
                  label="Gem. bereik"
                  value={fmtInt(
                    Math.round(stats?.gem_bereik_30d ?? 0)
                  )}
                />
              </div>
            </Card>
          </Section>
        </div>

        <Section
          title="Recente inzichten"
          subtitle="AI-agents schrijven hier hun bevindingen weg"
        >
          {insights.length === 0 ? (
            <EmptyState
              title="Nog geen inzichten"
              message="De agents (onderzoeker, recruiter, strateeg, creatief) hebben nog geen output geschreven. Trigger handmatig in claude.ai of via een geplande run."
              hint="bron: brandos_insights"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {insights.map((it, i) => (
                <InsightCard key={i} insight={it} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const conf = insight.confidence;
  const confVariant =
    conf === "high"
      ? "positive"
      : conf === "medium"
        ? "info"
        : conf === "hypothesis"
          ? "warning"
          : "ghost";
  return (
    <Card hoverable>
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="accent">{insight.agent}</Badge>
        {conf && <Badge variant={confVariant}>{conf}</Badge>}
      </div>
      <p className="text-sm leading-relaxed">{insight.summary}</p>
      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
        {fmtRelative(insight.generated_at)}
      </p>
    </Card>
  );
}
