import { supabaseServer } from "./supabase/server";

export async function openIngestionRun(source_id: string) {
  const { data, error } = await supabaseServer
    .from("brandos_ingestion_runs")
    .insert({ source_id, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function closeIngestionRun(
  id: string,
  result: {
    status: "success" | "partial" | "error";
    rows_upserted?: number;
    error?: string;
    meta?: Record<string, unknown>;
  }
) {
  await supabaseServer
    .from("brandos_ingestion_runs")
    .update({
      status: result.status,
      rows_upserted: result.rows_upserted ?? null,
      error: result.error ?? null,
      finished_at: new Date().toISOString(),
      meta: result.meta ?? null,
    })
    .eq("id", id);
}
