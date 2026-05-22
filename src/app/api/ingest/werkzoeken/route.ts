import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openIngestionRun, closeIngestionRun } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WZ = "https://api.werkzoeken.nl";

export async function POST() {
  const token = process.env.WERKZOEKEN_API_TOKEN;
  const company = process.env.WERKZOEKEN_COMPANY_ID;
  if (!token || !company) {
    return NextResponse.json(
      { error: "WERKZOEKEN_API_TOKEN of WERKZOEKEN_COMPANY_ID ontbreekt" },
      { status: 400 }
    );
  }

  const runId = await openIngestionRun("werkzoeken_vacancies");
  let rows = 0;
  try {
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Vacancy insights
    const insightRes = await fetch(
      `${WZ}/vacancy/insight?company_id=${encodeURIComponent(company)}`,
      { headers, cache: "no-store" }
    );
    if (!insightRes.ok) {
      throw new Error(`werkzoeken /vacancy/insight: ${insightRes.status}`);
    }
    const insightData = (await insightRes.json()) as {
      vacancies?: Array<{
        vacancy_id?: string;
        id?: string;
        title?: string;
        location?: string;
        url?: string;
        status?: string;
        published_at?: string;
        clicks?: number;
        applications?: number;
        application_starts?: number;
        avg_position?: number;
        cost?: number;
      }>;
    };

    const vacs = insightData.vacancies ?? [];

    if (vacs.length > 0) {
      const vacRows = vacs.map((v) => ({
        id: `wz_${v.vacancy_id ?? v.id}`,
        source_id: "werkzoeken_vacancies",
        origin: "werkzoeken",
        external_id: String(v.vacancy_id ?? v.id ?? ""),
        title: v.title ?? "Onbekend",
        location: v.location ?? null,
        url: v.url ?? null,
        status: v.status ?? "published",
        published_at: v.published_at ?? null,
        ingested_at: new Date().toISOString(),
      }));
      const { error } = await supabaseServer
        .from("brandos_vacancies")
        .upsert(vacRows, { onConflict: "id" });
      if (error) throw error;
      rows += vacRows.length;

      // metrics
      const today = new Date().toISOString().slice(0, 10);
      const metricRows = vacs.flatMap((v) => {
        const id = `wz_${v.vacancy_id ?? v.id}`;
        const m: Array<Record<string, unknown>> = [];
        if (v.clicks !== undefined) {
          m.push({
            source_id: "werkzoeken_vacancies",
            entity_type: "vacancy",
            entity_id: id,
            metric_date: today,
            metric: "clicks",
            value: v.clicks,
          });
        }
        if (v.applications !== undefined) {
          m.push({
            source_id: "werkzoeken_vacancies",
            entity_type: "vacancy",
            entity_id: id,
            metric_date: today,
            metric: "applications",
            value: v.applications,
          });
        }
        if (v.avg_position !== undefined) {
          m.push({
            source_id: "werkzoeken_vacancies",
            entity_type: "vacancy",
            entity_id: id,
            metric_date: today,
            metric: "avg_position",
            value: v.avg_position,
          });
        }
        return m;
      });
      if (metricRows.length > 0) {
        const { error: mErr } = await supabaseServer
          .from("brandos_metrics_daily")
          .upsert(metricRows, {
            onConflict:
              "source_id,entity_type,entity_id,metric_date,metric",
          });
        if (mErr) throw mErr;
        rows += metricRows.length;
      }
    }

    // 2. Clicks endpoint (daily detail)
    const clicksRes = await fetch(
      `${WZ}/click?company_id=${encodeURIComponent(company)}`,
      { headers, cache: "no-store" }
    );
    if (clicksRes.ok) {
      const clicksData = (await clicksRes.json()) as {
        clicks?: Array<{
          vacancy_id?: string;
          date?: string;
          clicks?: number;
        }>;
      };
      const clickRows = (clicksData.clicks ?? []).map((c) => ({
        source_id: "werkzoeken_clicks",
        entity_type: "vacancy",
        entity_id: `wz_${c.vacancy_id}`,
        metric_date: c.date ?? new Date().toISOString().slice(0, 10),
        metric: "clicks_daily",
        value: c.clicks ?? 0,
      }));
      if (clickRows.length > 0) {
        const { error } = await supabaseServer
          .from("brandos_metrics_daily")
          .upsert(clickRows, {
            onConflict:
              "source_id,entity_type,entity_id,metric_date,metric",
          });
        if (error) throw error;
        rows += clickRows.length;
      }
    }

    await closeIngestionRun(runId, {
      status: "success",
      rows_upserted: rows,
    });
    return NextResponse.json({ ok: true, rows_upserted: rows });
  } catch (e) {
    await closeIngestionRun(runId, {
      status: "error",
      error: (e as Error).message,
    });
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
