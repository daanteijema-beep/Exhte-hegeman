import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openIngestionRun, closeIngestionRun } from "@/lib/ingest";
import { requireCronAuthOrPost } from "@/lib/cron";
import {
  fetchFacebookAds,
  fetchFacebookOrganic,
  fetchInstagram,
  fetchGa4,
  type MetricRow,
} from "@/lib/windsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function upsertChunked(
  table: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
  chunk = 500
): Promise<number> {
  if (rows.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabaseServer
      .from(table)
      .upsert(batch as any, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    total += batch.length;
  }
  return total;
}

const METRICS_CONFLICT =
  "source_id,entity_type,entity_id,metric_date,metric";

async function run(range: string) {
  const stats: Record<string, unknown> = {};
  const errors: Array<{ step: string; error: string }> = [];

  // STAP 1: Facebook Ads
  {
    const runId = await openIngestionRun("facebook_ads");
    try {
      const { metrics, ads } = await fetchFacebookAds(range);
      const m = await upsertChunked(
        "brandos_metrics_daily",
        metrics as unknown as Array<Record<string, unknown>>,
        METRICS_CONFLICT
      );
      const a = await upsertChunked("brandos_ads", ads, "id");
      stats.fb_ads = { metrics: m, ads: a };
      await closeIngestionRun(runId, {
        status: "success",
        rows_upserted: m + a,
      });
    } catch (e) {
      const msg = (e as Error).message;
      errors.push({ step: "facebook_ads", error: msg });
      await closeIngestionRun(runId, { status: "error", error: msg });
    }
  }

  // STAP 2: Facebook Organic
  {
    const runId = await openIngestionRun("facebook_organic");
    try {
      const { metrics, posts } = await fetchFacebookOrganic(range);
      const m = await upsertChunked(
        "brandos_metrics_daily",
        metrics as unknown as Array<Record<string, unknown>>,
        METRICS_CONFLICT
      );
      const p = await upsertChunked("brandos_social_posts", posts, "id");
      stats.fb_organic = { metrics: m, posts: p };
      await closeIngestionRun(runId, {
        status: "success",
        rows_upserted: m + p,
      });
    } catch (e) {
      const msg = (e as Error).message;
      errors.push({ step: "facebook_organic", error: msg });
      await closeIngestionRun(runId, { status: "error", error: msg });
    }
  }

  // STAP 3: Instagram
  {
    const runId = await openIngestionRun("instagram");
    try {
      const { metrics, posts } = await fetchInstagram(range);
      const m = await upsertChunked(
        "brandos_metrics_daily",
        metrics as unknown as Array<Record<string, unknown>>,
        METRICS_CONFLICT
      );
      const p = await upsertChunked("brandos_social_posts", posts, "id");
      stats.instagram = { metrics: m, posts: p };
      await closeIngestionRun(runId, {
        status: "success",
        rows_upserted: m + p,
      });
    } catch (e) {
      const msg = (e as Error).message;
      errors.push({ step: "instagram", error: msg });
      await closeIngestionRun(runId, { status: "error", error: msg });
    }
  }

  // STAP 4: GA4
  {
    const runId = await openIngestionRun("ga4");
    try {
      const metrics = await fetchGa4(range);
      const m = await upsertChunked(
        "brandos_metrics_daily",
        metrics as unknown as Array<Record<string, unknown>>,
        METRICS_CONFLICT
      );
      stats.ga4 = { metrics: m };
      await closeIngestionRun(runId, {
        status: "success",
        rows_upserted: m,
      });
    } catch (e) {
      const msg = (e as Error).message;
      errors.push({ step: "ga4", error: msg });
      await closeIngestionRun(runId, { status: "error", error: msg });
    }
  }

  return { ok: errors.length === 0, range, stats, errors };
}

function parseRange(req: NextRequest): string {
  const r = req.nextUrl.searchParams.get("range");
  if (!r) return "last_30d";
  // Whitelist Windsor's date_preset values
  if (!/^(last_\d+[dwmy]T?|last_year|last_yearT|last_2years|last_2yearsT|this_month|this_monthT|this_year|this_yearT)$/.test(r)) {
    throw new Error(`invalid range: ${r}`);
  }
  return r;
}

export async function POST(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  try {
    return NextResponse.json(await run(parseRange(req)));
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  try {
    return NextResponse.json(await run(parseRange(req)));
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
