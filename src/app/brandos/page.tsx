import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/brandos/Section";
import { StatCard } from "@/components/brandos/StatCard";
import { ErrorState } from "@/components/brandos/EmptyState";
import { FilterBar } from "@/components/brandos/FilterBar";
import { UrgencyCard } from "@/components/brandos/UrgencyCard";
import { VacaturesTable } from "@/components/brandos/VacaturesTable";
import { fmtInt, fmtDate } from "@/lib/format";
import { computeUrgency } from "@/lib/brandos/urgency";
import type {
  DashboardStats,
  Vacature,
  WerkzoekenTijdreeks,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = {
  dept?: string | string[];
  loc?: string | string[];
  emp?: string | string[];
  q?: string;
};

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const toArr = (v?: string | string[]) =>
    Array.isArray(v) ? v : v ? [v] : [];
  const depts = toArr(sp.dept);
  const locs = toArr(sp.loc);
  const emps = toArr(sp.emp);
  const q = (sp.q ?? "").toLowerCase();

  try {
    const [statsRes, vacRes, tijdreeksRes] = await Promise.all([
      supabaseServer
        .from("v_dashboard_stats")
        .select("*")
        .maybeSingle<DashboardStats>(),
      supabaseServer
        .from("v_vacatures_with_urgency")
        .select("*")
        .returns<Vacature[]>(),
      supabaseServer
        .from("v_werkzoeken_tijdreeks")
        .select("*")
        .gte(
          "metric_date",
          new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
        )
        .returns<WerkzoekenTijdreeks[]>(),
    ]);
    const stats = statsRes.data;
    const allVacs = (vacRes.data ?? []).filter((v) => v.status === "published");
    const tijdreeks = tijdreeksRes.data ?? [];

    const countBy = (key: keyof Vacature) => {
      const m = new Map<string, number>();
      allVacs.forEach((v) => {
        const k = (v[key] as string | null)?.trim();
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      });
      return Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count }));
    };

    let filtered = allVacs.slice();
    if (depts.length)
      filtered = filtered.filter(
        (v) => v.department && depts.includes(v.department)
      );
    if (locs.length)
      filtered = filtered.filter(
        (v) => v.location && locs.includes(v.location)
      );
    if (emps.length)
      filtered = filtered.filter(
        (v) => v.employment_type && emps.includes(v.employment_type)
      );
    if (q) filtered = filtered.filter((v) => v.title.toLowerCase().includes(q));

    const withUrgency = filtered
      .map((v) => ({
        v,
        urgency: computeUrgency({
          dagen_online: v.dagen_online,
          web_pageviews: v.web_pageviews,
          wz_applications: v.wz_applications,
          pv_last_14d: v.pv_last_14d,
          pv_prev_14d: v.pv_prev_14d,
          salary_min: v.salary_min,
          description_length: v.description_length,
        }),
      }))
      .filter((x) => x.urgency.label !== "ok")
      .sort((a, b) => b.urgency.score - a.urgency.score)
      .slice(0, 6);

    const sparkFor = (vacancy_id: string) =>
      tijdreeks
        .filter((t) => t.vacancy_id === vacancy_id)
        .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
        .slice(-30)
        .map((t) => Number(t.clicks ?? 0));

    return (
      <>
        <PageHeader
          title="Vacatures Hub"
          subtitle="Aandacht-eerst overzicht — Recruitee-master + Werkzoeken & GA4 overlay."
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

        <Section title="Kernindicatoren" subtitle="">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Actieve vacatures"
              value={fmtInt(stats?.actieve_vacatures ?? 0)}
              hint="Recruitee"
              accent
            />
            <StatCard
              label="Lang open >60d"
              value={fmtInt(stats?.vacatures_lang_open ?? 0)}
              hint="aandachtspunt"
              alert={(stats?.vacatures_lang_open ?? 0) > 0}
            />
            <StatCard
              label="Totaal kandidaten"
              value={fmtInt(stats?.totaal_kandidaten ?? 0)}
              hint="Recruitee"
            />
            <StatCard
              label="Competitor vacatures"
              value={fmtInt(stats?.competitor_open_vacatures ?? 0)}
              hint="BAM/Heijmans/Dura"
            />
          </div>
        </Section>

        <FilterBar
          departments={countBy("department")}
          locations={countBy("location")}
          employmentTypes={countBy("employment_type")}
        />

        <Section
          title="Aandacht NU"
          subtitle={
            withUrgency.length === 0
              ? "Alles onder controle"
              : `${withUrgency.length} vacature(s) met urgentie-score`
          }
        >
          {withUrgency.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {withUrgency.map(({ v, urgency }) => (
                <UrgencyCard
                  key={v.id}
                  vacature={v}
                  urgency={urgency}
                  spark={sparkFor(v.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Alle vacatures"
          subtitle="Klik op een rij voor details."
        >
          <VacaturesTable vacatures={filtered} tijdreeks={tijdreeks} />
        </Section>
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
