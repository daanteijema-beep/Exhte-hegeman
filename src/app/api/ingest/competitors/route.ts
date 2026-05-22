import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openIngestionRun, closeIngestionRun } from "@/lib/ingest";
import { requireCronAuthOrPost } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CompVac = {
  id: string;
  competitor: string;
  external_id: string;
  title: string;
  location: string | null;
  url: string | null;
  description_excerpt: string | null;
  posted_at: string | null;
};

async function scrapeDuraVermeer(): Promise<CompVac[]> {
  // Public BFF — limit & offset pagination
  const out: CompVac[] = [];
  let offset = 0;
  while (true) {
    const url = `https://api-bff.duravermeer.nl/v1/jobs?limit=100&offset=${offset}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) break;
    const data = (await res.json()) as {
      jobs?: Array<{
        id: string | number;
        title: string;
        location?: string;
        url?: string;
        excerpt?: string;
        posted_at?: string;
      }>;
      total?: number;
    };
    const jobs = data.jobs ?? [];
    if (jobs.length === 0) break;
    for (const j of jobs) {
      out.push({
        id: `dura_${j.id}`,
        competitor: "dura-vermeer",
        external_id: String(j.id),
        title: j.title,
        location: j.location ?? null,
        url: j.url ?? null,
        description_excerpt: j.excerpt ?? null,
        posted_at: j.posted_at ?? null,
      });
    }
    if (jobs.length < 100) break;
    offset += 100;
    if (offset > 1000) break;
  }
  return out;
}

async function scrapeHeijmans(): Promise<CompVac[]> {
  // Index page → JSON-LD JobPosting on each detail
  const indexRes = await fetch("https://werkenbij.heijmans.nl/vacatures/", {
    cache: "no-store",
  });
  if (!indexRes.ok) return [];
  const html = await indexRes.text();
  const urls = Array.from(
    html.matchAll(/href="(https:\/\/werkenbij\.heijmans\.nl\/vacatures\/[^"]+)"/g)
  )
    .map((m) => m[1])
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 60);

  const out: CompVac[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const h = await r.text();
      const m = h.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
      );
      if (!m) continue;
      const ld = JSON.parse(m[1]) as {
        "@type"?: string | string[];
        identifier?: string | { value?: string };
        title?: string;
        jobLocation?: { address?: { addressLocality?: string } };
        datePosted?: string;
        description?: string;
      };
      const type = Array.isArray(ld["@type"])
        ? ld["@type"][0]
        : ld["@type"];
      if (type !== "JobPosting") continue;
      const id =
        typeof ld.identifier === "string"
          ? ld.identifier
          : (ld.identifier?.value ?? url);
      out.push({
        id: `heij_${id}`,
        competitor: "heijmans",
        external_id: String(id),
        title: ld.title ?? "",
        location: ld.jobLocation?.address?.addressLocality ?? null,
        url,
        description_excerpt:
          ld.description?.replace(/<[^>]+>/g, " ").slice(0, 400) ?? null,
        posted_at: ld.datePosted ?? null,
      });
    } catch {
      // skip
    }
  }
  return out;
}

async function scrapeBAM(): Promise<CompVac[]> {
  // Phenom CaaS
  const url =
    "https://bam1global.jobs/api/jobs?tenant=BAM1GLOBAL&size=200&from=0&filter=siteType_eq_external";
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const data = (await r.json()) as {
      jobs?: Array<{
        jobId: string;
        title: string;
        city?: string;
        country?: string;
        applyUrl?: string;
        url?: string;
        postingDate?: string;
        description?: string;
      }>;
    };
    return (data.jobs ?? []).map((j) => ({
      id: `bam_${j.jobId}`,
      competitor: "bam",
      external_id: j.jobId,
      title: j.title,
      location: [j.city, j.country].filter(Boolean).join(", ") || null,
      url: j.applyUrl ?? j.url ?? null,
      description_excerpt: j.description?.slice(0, 400) ?? null,
      posted_at: j.postingDate ?? null,
    }));
  } catch {
    return [];
  }
}

async function run() {
  const runId = await openIngestionRun("competitors_dura");
  try {
    const [dura, heij, bam] = await Promise.all([
      scrapeDuraVermeer().catch(() => []),
      scrapeHeijmans().catch(() => []),
      scrapeBAM().catch(() => []),
    ]);
    const all = [...dura, ...heij, ...bam];
    const now = new Date().toISOString();

    if (all.length > 0) {
      const rows = all.map((v) => ({
        ...v,
        first_seen_at: now,
        last_seen_at: now,
        is_currently_open: true,
      }));
      // upsert — pg uniqueness on id, last_seen_at always overwrites
      const { error } = await supabaseServer
        .from("brandos_competitor_vacancies")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: false });
      if (error) throw error;
    }

    // mark stale = not in current scrape as closed
    const seenIds = new Set(all.map((v) => v.id));
    const { data: existing } = await supabaseServer
      .from("brandos_competitor_vacancies")
      .select("id")
      .eq("is_currently_open", true);
    const toClose = (existing ?? [])
      .map((r) => r.id as string)
      .filter((id) => !seenIds.has(id));
    if (toClose.length > 0) {
      await supabaseServer
        .from("brandos_competitor_vacancies")
        .update({ is_currently_open: false })
        .in("id", toClose);
    }

    // daily signal: vacancy_count per competitor
    const today = new Date().toISOString().slice(0, 10);
    const byComp: Record<string, number> = {};
    for (const v of all) byComp[v.competitor] = (byComp[v.competitor] ?? 0) + 1;
    if (Object.keys(byComp).length > 0) {
      const sigRows = Object.entries(byComp).map(([c, n]) => ({
        competitor: c,
        signal_date: today,
        signal_type: "open_vacancy_count",
        value: n,
      }));
      await supabaseServer
        .from("brandos_competitor_signals")
        .upsert(sigRows, {
          onConflict: "competitor,signal_date,signal_type",
        });
    }

    await closeIngestionRun(runId, {
      status: "success",
      rows_upserted: all.length,
      meta: {
        dura: dura.length,
        heijmans: heij.length,
        bam: bam.length,
        closed: toClose.length,
      },
    });
    return NextResponse.json({
      ok: true,
      rows_upserted: all.length,
      dura: dura.length,
      heijmans: heij.length,
      bam: bam.length,
      closed_stale: toClose.length,
    });
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

export async function POST(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  return run();
}

export async function GET(req: NextRequest) {
  const block = requireCronAuthOrPost(req);
  if (block) return block;
  return run();
}
