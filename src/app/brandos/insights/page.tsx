import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { EmptyState, ErrorState } from "@/components/brandos/EmptyState";
import { fmtRelative } from "@/lib/format";
import type { Insight } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  try {
    const { data } = await supabaseServer
      .from("brandos_insights")
      .select("agent, topic, summary, confidence, generated_at")
      .order("generated_at", { ascending: false })
      .limit(50)
      .returns<Insight[]>();
    const insights = data ?? [];

    return (
      <>
        <PageHeader
          title="Inzichten"
          subtitle="Output van de BrandOS-agents — laatste 50."
        />
        <Section title="Feed" subtitle="">
          {insights.length === 0 ? (
            <EmptyState
              title="Nog geen inzichten"
              message="De agents schreven nog niets weg. Trigger via /api/agents/* of wacht op de geplande maandag-run."
              hint="bron: brandos_insights"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {insights.map((it, i) => {
                const v =
                  it.confidence === "high"
                    ? "positive"
                    : it.confidence === "medium"
                      ? "info"
                      : it.confidence === "hypothesis"
                        ? "warning"
                        : "ghost";
                return (
                  <Card key={i} hoverable>
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="accent">{it.agent}</Badge>
                      {it.confidence && <Badge variant={v}>{it.confidence}</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed">{it.summary}</p>
                    <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
                      {fmtRelative(it.generated_at)}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
