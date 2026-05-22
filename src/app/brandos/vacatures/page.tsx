import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/brandos/Section";
import { VacaturesTable } from "@/components/brandos/VacaturesTable";
import { ErrorState } from "@/components/brandos/EmptyState";
import type { Vacature, WerkzoekenTijdreeks } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VacaturesPage() {
  try {
    const [vacs, tr] = await Promise.all([
      supabaseServer
        .from("v_vacatures")
        .select("*")
        .order("published_at", { ascending: false })
        .returns<Vacature[]>(),
      supabaseServer
        .from("v_werkzoeken_tijdreeks")
        .select("vacancy_id, title, metric_date, clicks, applications")
        .order("metric_date", { ascending: true })
        .returns<WerkzoekenTijdreeks[]>(),
    ]);

    return (
      <>
        <PageHeader
          title="Vacatures"
          subtitle="Alle openstaande en gearchiveerde rollen uit Recruitee gecombineerd met live click/sollicitatie-data uit Werkzoeken."
          meta={
            <>
              Totaal
              <br />
              <span className="text-text">{vacs.data?.length ?? 0}</span>
            </>
          }
        />
        <VacaturesTable
          vacatures={vacs.data ?? []}
          tijdreeks={tr.data ?? []}
        />
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}
