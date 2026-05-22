import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openIngestionRun, closeIngestionRun } from "@/lib/ingest";
import { requireCronAuthOrPost } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

async function run() {
  const token = process.env.RECRUITEE_API_TOKEN;
  const company = process.env.RECRUITEE_COMPANY_ID;
  if (!token || !company) {
    return NextResponse.json(
      { error: "RECRUITEE_API_TOKEN of RECRUITEE_COMPANY_ID ontbreekt" },
      { status: 400 }
    );
  }

  const runId = await openIngestionRun("recruitee_offers");
  let rows = 0;
  const base = `https://api.recruitee.com/c/${company}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    // 1. Offers (incl archived)
    const offersRes = await fetch(
      `${base}/offers?scope=default,archived&limit=200`,
      { headers, cache: "no-store" }
    );
    if (!offersRes.ok) {
      const t = await offersRes.text();
      throw new Error(`recruitee /offers: ${offersRes.status} ${t.slice(0, 200)}`);
    }
    const offersData = (await offersRes.json()) as {
      offers?: Array<{
        id: number;
        title: string;
        location?: string;
        city?: string;
        country_code?: string;
        url?: string;
        careers_url?: string;
        status?: string;
        kind?: string;
        published_at?: string;
        closed_at?: string;
        employment_type?: string;
        department?: string;
        salary?: {
          min?: number;
          max?: number;
          currency?: string;
        };
        description?: string;
      }>;
    };

    const offers = offersData.offers ?? [];

    // /offers list-endpoint geeft GEEN description — fetch per offer voor
    // de volledige tekst (HTML wordt naar plain text gestript).
    const detailMap = new Map<number, string>();
    await Promise.all(
      offers.map(async (o) => {
        try {
          const r = await fetch(`${base}/offers/${o.id}`, {
            headers,
            cache: "no-store",
          });
          if (!r.ok) return;
          const d = (await r.json()) as { offer?: { description?: string; description_html?: string } };
          const html = d.offer?.description ?? d.offer?.description_html ?? "";
          const text = htmlToText(html);
          if (text.length > 0) detailMap.set(o.id, text.slice(0, 5000));
        } catch {
          // best-effort: skip on failure
        }
      })
    );

    if (offers.length > 0) {
      const offerRows = offers.map((o) => ({
        id: `recruitee_${o.id}`,
        source_id: "recruitee_offers",
        origin: "recruitee",
        external_id: String(o.id),
        title: o.title,
        department: o.department ?? null,
        location:
          o.location ??
          [o.city, o.country_code].filter(Boolean).join(", ") ??
          null,
        employment_type: o.employment_type ?? null,
        status: o.status ?? "draft",
        url: o.careers_url ?? o.url ?? null,
        description: detailMap.get(o.id) ?? null,
        salary_min: o.salary?.min ?? null,
        salary_max: o.salary?.max ?? null,
        salary_currency: o.salary?.currency ?? null,
        published_at: o.published_at ?? null,
        closed_at: o.closed_at ?? null,
        ingested_at: new Date().toISOString(),
      }));
      const { error } = await supabaseServer
        .from("brandos_vacancies")
        .upsert(offerRows, { onConflict: "id" });
      if (error) throw error;
      rows += offerRows.length;
    }

    // 2. Candidates paginated
    let page = 1;
    const PAGE_LIMIT = 100;
    let totalCandidates = 0;
    const allPlacements: Array<Record<string, unknown>> = [];
    while (true) {
      const cRes = await fetch(
        `${base}/search/new/candidates?limit=${PAGE_LIMIT}&page=${page}`,
        { headers, cache: "no-store" }
      );
      if (!cRes.ok) break;
      const cData = (await cRes.json()) as {
        hits?: Array<{
          id: number;
          name?: string;
          emails?: string[];
          phones?: string[];
          source?: string;
          created_at?: string;
          updated_at?: string;
          placements?: Array<{
            id?: number;
            offer_id?: number;
            stage?: { name?: string } | null;
            disqualified?: boolean;
            disqualify_reason?: string;
            created_at?: string;
            updated_at?: string;
            disqualified_at?: string;
          }>;
        }>;
      };
      const hits = cData.hits ?? [];
      if (hits.length === 0) break;

      const candRows = hits.map((h) => ({
        id: `rc_cand_${h.id}`,
        source_id: "recruitee_candidates",
        external_id: String(h.id),
        name: h.name ?? "?",
        emails: h.emails ?? [],
        phones: h.phones ?? [],
        source: h.source ?? null,
        created_at: h.created_at ?? null,
        updated_at: h.updated_at ?? null,
        ingested_at: new Date().toISOString(),
      }));
      const { error: candErr } = await supabaseServer
        .from("brandos_candidates")
        .upsert(candRows, { onConflict: "id" });
      if (candErr) throw candErr;
      totalCandidates += candRows.length;

      for (const h of hits) {
        for (const p of h.placements ?? []) {
          allPlacements.push({
            id: `rc_plc_${p.id ?? `${h.id}_${p.offer_id}`}`,
            candidate_id: `rc_cand_${h.id}`,
            vacancy_id: p.offer_id ? `rc_${p.offer_id}` : null,
            stage: p.stage?.name?.toLowerCase() ?? "sourced",
            disqualified: p.disqualified ?? false,
            disqualify_reason: p.disqualify_reason ?? null,
            disqualified_at: p.disqualified_at ?? null,
            created_at: p.created_at ?? null,
            updated_at: p.updated_at ?? null,
          });
        }
      }

      if (hits.length < PAGE_LIMIT) break;
      page++;
      if (page > 20) break; // safety
    }

    rows += totalCandidates;

    if (allPlacements.length > 0) {
      const { error: pErr } = await supabaseServer
        .from("brandos_placements")
        .upsert(allPlacements, { onConflict: "id" });
      if (pErr) throw pErr;
      rows += allPlacements.length;
    }

    await closeIngestionRun(runId, {
      status: "success",
      rows_upserted: rows,
      meta: {
        offers: offers.length,
        candidates: totalCandidates,
        placements: allPlacements.length,
      },
    });
    return NextResponse.json({
      ok: true,
      rows_upserted: rows,
      offers: offers.length,
      candidates: totalCandidates,
      placements: allPlacements.length,
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
