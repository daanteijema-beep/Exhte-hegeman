import { createHash } from "node:crypto";

const API_BASE = "https://connectors.windsor.ai";

function hashShort(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 10);
}

async function fetchWindsor(
  connector: string,
  params: Record<string, string>
): Promise<unknown[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY ontbreekt");
  const qs = new URLSearchParams({ api_key: apiKey, ...params }).toString();
  const url = `${API_BASE}/${connector}?${qs}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Windsor ${connector}: ${res.status} ${text.slice(0, 200)}`
    );
  }
  const json = (await res.json()) as { data?: unknown[] };
  return Array.isArray(json) ? json : (json.data ?? []);
}

export type MetricRow = {
  source_id: string;
  entity_type: string;
  entity_id: string;
  metric_date: string;
  metric: string;
  value: number;
};

// ============================================================
// Facebook Ads
// ============================================================
const FB_ADS_METRICS = [
  "spend",
  "impressions",
  "clicks",
  "reach",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "actions_lead",
  "actions_video_view",
] as const;

type FbAdRow = {
  date?: string;
  campaign?: string;
  campaign_id?: string;
  campaign_objective?: string;
  campaign_status?: string;
  adset_name?: string;
  adset_id?: string;
  ad_name?: string;
  [k: string]: unknown;
};

export async function fetchFacebookAds(range: string): Promise<{
  metrics: MetricRow[];
  ads: Array<Record<string, unknown>>;
}> {
  const data = (await fetchWindsor("facebook", {
    fields:
      "date,campaign,campaign_id,campaign_objective,campaign_status,adset_name,adset_id,ad_name,spend,impressions,clicks,reach,ctr,cpc,cpm,frequency,actions_lead,actions_video_view",
    date_preset: range,
    account_id: "1310923534408492",
  })) as FbAdRow[];

  const seen = new Map<string, MetricRow>();
  for (const r of data) {
    if (!r.campaign_id || !r.date) continue;
    for (const m of FB_ADS_METRICS) {
      const v = r[m];
      if (v === null || v === undefined) continue;
      const row: MetricRow = {
        source_id: "facebook_ads",
        entity_type: "campaign",
        entity_id: String(r.campaign_id),
        metric_date: r.date,
        metric: m,
        value: Number(v),
      };
      seen.set(`${row.entity_id}|${row.metric_date}|${row.metric}`, row);
    }
  }

  const adsByKey = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();
  for (const r of data) {
    if (!r.ad_name || !r.campaign_id) continue;
    const id = `facebook_${r.campaign_id}_${hashShort(r.ad_name)}`;
    const row = {
      id,
      source_id: "facebook_ads",
      external_id: id,
      ad_name: r.ad_name,
      adset_id: r.adset_id ?? null,
      adset_name: r.adset_name ?? null,
      campaign_id: String(r.campaign_id),
      campaign_name: r.campaign ?? null,
      campaign_objective: r.campaign_objective ?? null,
      status: r.campaign_status ?? null,
      ingested_at: now,
    };
    adsByKey.set(id, { ...(adsByKey.get(id) ?? {}), ...row });
  }

  return { metrics: [...seen.values()], ads: [...adsByKey.values()] };
}

// ============================================================
// Facebook Organic
// ============================================================
const FB_PAGE_METRICS = [
  "page_fans",
  "page_impressions",
  "page_reach",
  "page_views_total",
  "page_post_engagements",
] as const;

type FbOrgRow = {
  date?: string;
  post_id?: string;
  post_message?: string;
  post_created_time?: string;
  post_impressions?: number;
  post_reach?: number;
  post_reactions_like_total?: number;
  post_clicks?: number;
  [k: string]: unknown;
};

export async function fetchFacebookOrganic(range: string): Promise<{
  metrics: MetricRow[];
  posts: Array<Record<string, unknown>>;
}> {
  const data = (await fetchWindsor("facebook_organic", {
    fields:
      "date,page_fans,page_impressions,page_reach,page_views_total,page_post_engagements,post_id,post_message,post_created_time,post_impressions,post_reach,post_reactions_like_total,post_clicks",
    date_preset: range,
    account_id: "859572503907766",
  })) as FbOrgRow[];

  const metricsMap = new Map<string, MetricRow>();
  for (const r of data) {
    if (!r.date) continue;
    for (const m of FB_PAGE_METRICS) {
      const v = r[m];
      if (v === null || v === undefined) continue;
      metricsMap.set(`${r.date}|${m}`, {
        source_id: "facebook_organic",
        entity_type: "page",
        entity_id: "werkenbijhegeman",
        metric_date: r.date,
        metric: m,
        value: Number(v),
      });
    }
  }

  const postsMap = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();
  for (const p of data) {
    if (!p.post_id) continue;
    const row = {
      id: `fb_${p.post_id}`,
      source_id: "facebook_organic",
      platform: "facebook",
      caption: p.post_message ?? null,
      posted_at: p.post_created_time ?? null,
      impressions: p.post_impressions ?? null,
      reach: p.post_reach ?? null,
      like_count: p.post_reactions_like_total ?? 0,
      meta: { post_clicks: p.post_clicks ?? 0 },
      ingested_at: now,
    };
    postsMap.set(p.post_id, { ...(postsMap.get(p.post_id) ?? {}), ...row });
  }

  return {
    metrics: [...metricsMap.values()],
    posts: [...postsMap.values()],
  };
}

// ============================================================
// Instagram
// ============================================================
const IG_METRICS = [
  "followers_count",
  "follower_count_1d",
  "reach_1d",
  "impressions_1d",
  "profile_views_1d",
] as const;

type IgRow = {
  date?: string;
  media_id?: string;
  media_caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_permalink?: string;
  media_like_count?: number;
  media_comments_count?: number;
  media_views?: number;
  media_reach?: number;
  media_engagement?: number;
  media_saved?: number;
  media_shares?: number;
  [k: string]: unknown;
};

export async function fetchInstagram(range: string): Promise<{
  metrics: MetricRow[];
  posts: Array<Record<string, unknown>>;
}> {
  const data = (await fetchWindsor("instagram", {
    fields:
      "date,followers_count,follower_count_1d,reach_1d,impressions_1d,profile_views_1d,media_id,media_caption,media_type,media_product_type,media_permalink,media_like_count,media_comments_count,media_views,media_reach,media_engagement,media_saved,media_shares",
    date_preset: range,
    account_id: "17841478431768012",
  })) as IgRow[];

  const metricsMap = new Map<string, MetricRow>();
  for (const r of data) {
    if (!r.date) continue;
    for (const m of IG_METRICS) {
      const v = r[m];
      if (v === null || v === undefined) continue;
      metricsMap.set(`${r.date}|${m}`, {
        source_id: "instagram",
        entity_type: "page",
        entity_id: "werkenbijhegeman",
        metric_date: r.date,
        metric: m,
        value: Number(v),
      });
    }
  }

  const now = new Date().toISOString();
  const posts = data
    .filter((r) => r.media_id)
    .map((p) => ({
      id: `ig_${p.media_id}`,
      source_id: "instagram",
      platform: "instagram",
      media_type: p.media_type ?? null,
      media_product_type: p.media_product_type ?? null,
      caption: p.media_caption ?? null,
      permalink: p.media_permalink ?? null,
      posted_at: p.date ? `${p.date}T00:00:00+0000` : null,
      like_count: p.media_like_count ?? 0,
      comment_count: p.media_comments_count ?? 0,
      share_count: p.media_shares ?? 0,
      impressions: p.media_views ?? null,
      reach: p.media_reach ?? null,
      meta: { saved: p.media_saved, engagement: p.media_engagement },
      ingested_at: now,
    }));

  return { metrics: [...metricsMap.values()], posts };
}

// ============================================================
// GA4
// ============================================================
const GA4_METRICS = [
  "sessions",
  "active_users",
  "bounce_rate",
  "average_session_duration",
  "screen_page_views",
] as const;

type Ga4Row = {
  date?: string;
  source?: string;
  medium?: string;
  [k: string]: unknown;
};

export async function fetchGa4(range: string): Promise<MetricRow[]> {
  const data = (await fetchWindsor("googleanalytics4", {
    fields:
      "date,sessions,active_users,bounce_rate,average_session_duration,screen_page_views,source,medium",
    date_preset: range,
    account_id: "387075288",
  })) as Ga4Row[];

  const agg = new Map<string, MetricRow>();
  for (const r of data) {
    if (!r.date) continue;
    const src = (r.source ?? "(direct)").trim();
    const med = (r.medium ?? "(none)").trim();
    const entity = `${src}/${med}`;
    for (const m of GA4_METRICS) {
      const v = r[m];
      if (v === null || v === undefined) continue;
      const k = `${entity}|${r.date}|${m}`;
      const num = Number(v);
      if (agg.has(k)) {
        const prev = agg.get(k)!;
        if (m === "bounce_rate" || m === "average_session_duration") {
          prev.value = (prev.value + num) / 2;
        } else {
          prev.value += num;
        }
      } else {
        agg.set(k, {
          source_id: "ga4",
          entity_type: "page",
          entity_id: entity,
          metric_date: r.date,
          metric: m,
          value: num,
        });
      }
    }
  }
  return [...agg.values()];
}
