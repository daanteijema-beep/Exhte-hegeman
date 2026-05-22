import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/brandos/Section";
import { Card } from "@/components/brandos/Card";
import { Badge } from "@/components/brandos/Badge";
import { Tabs } from "@/components/brandos/Tabs";
import { EmptyState, ErrorState } from "@/components/brandos/EmptyState";
import { fmtInt, fmtEur, fmtPct, fmtDate } from "@/lib/format";
import type {
  Campagne,
  Ad,
  SocialPost,
  Ga4Bron,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampagnesPage() {
  try {
    const [campRes, adsRes, socialRes, ga4Res] = await Promise.all([
      supabaseServer
        .from("v_campagnes")
        .select("*")
        .order("totaal_spend", { ascending: false })
        .returns<Campagne[]>(),
      supabaseServer
        .from("v_ads")
        .select("*")
        .order("totaal_spend", { ascending: false })
        .returns<Ad[]>(),
      supabaseServer
        .from("v_social_posts")
        .select("*")
        .order("engagement_rate", { ascending: false, nullsFirst: false })
        .returns<SocialPost[]>(),
      supabaseServer
        .from("v_ga4_bronnen")
        .select("*")
        .order("sessies", { ascending: false })
        .returns<Ga4Bron[]>(),
    ]);

    const campagnes = campRes.data ?? [];
    const ads = adsRes.data ?? [];
    const social = socialRes.data ?? [];
    const ga4 = ga4Res.data ?? [];

    return (
      <>
        <PageHeader
          title="Campagnes & Ads"
          subtitle="Betaalde campagnes, individuele ads, organic social en GA4 verkeer — alle marketingkanalen in één overzicht."
        />

        <Tabs
          tabs={[
            {
              key: "campaigns",
              label: "Campagnes",
              count: campagnes.length,
              content: <CampagnesTab data={campagnes} />,
            },
            {
              key: "ads",
              label: "Individuele ads",
              count: ads.length,
              content: <AdsTab data={ads} />,
            },
            {
              key: "social",
              label: "Organic social",
              count: social.length,
              content: <SocialTab data={social} />,
            },
            {
              key: "ga4",
              label: "GA4 verkeer",
              count: ga4.length,
              content: <Ga4Tab data={ga4} />,
            },
          ]}
        />
      </>
    );
  } catch (e) {
    return <ErrorState message={(e as Error).message ?? "onbekende fout"} />;
  }
}

function CampagnesTab({ data }: { data: Campagne[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Geen Meta Ads data"
        message="Wacht op Windsor ingest. Run de Windsor agent in claude.ai of trigger /api/ingest/windsor wanneer aanwezig."
        hint="bron: v_campagnes"
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
            <th className="px-3 py-3">Campagne</th>
            <th className="px-3 py-3">Periode</th>
            <th className="px-3 py-3 text-right">Spend</th>
            <th className="px-3 py-3 text-right">Impressies</th>
            <th className="px-3 py-3 text-right">Clicks</th>
            <th className="px-3 py-3 text-right">CTR</th>
            <th className="px-3 py-3 text-right">CPC</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const lowCtr = (c.gem_ctr ?? 0) > 0 && (c.gem_ctr ?? 0) < 1.2;
            return (
              <tr
                key={c.campaign_id}
                className={[
                  "border-b border-border last:border-0",
                  lowCtr ? "bg-negative/5" : "",
                ].join(" ")}
              >
                <td className="px-3 py-2.5">{c.campaign_name}</td>
                <td className="px-3 py-2.5 text-xs text-text-dim">
                  {fmtDate(c.eerste_dag)} – {fmtDate(c.laatste_dag)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtEur(c.totaal_spend)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtInt(c.totaal_impressions)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtInt(c.totaal_clicks)}
                </td>
                <td
                  className={[
                    "px-3 py-2.5 text-right font-mono",
                    lowCtr ? "text-negative" : "",
                  ].join(" ")}
                >
                  {fmtPct(c.gem_ctr, 2)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtEur(c.gem_cpc)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdsTab({ data }: { data: Ad[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Geen ads beschikbaar"
        message="Individuele ads worden gevuld door dezelfde Windsor ingest als campagnes."
        hint="bron: v_ads"
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((a) => (
        <Card key={a.id} hoverable className="overflow-hidden p-0">
          {a.creative_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.creative_image_url}
              alt={a.ad_name ?? ""}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-card-hover font-mono text-xs text-text-muted">
              geen visual
            </div>
          )}
          <div className="p-4">
            <div className="mb-1.5 flex items-center gap-2">
              {a.status && (
                <Badge
                  variant={a.status === "ACTIVE" ? "positive" : "ghost"}
                >
                  {a.status}
                </Badge>
              )}
              {a.campaign_objective && (
                <Badge variant="ghost">{a.campaign_objective}</Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm font-medium">
              {a.creative_title ?? a.ad_name ?? "—"}
            </p>
            {a.campaign_name && (
              <p className="mt-1 text-xs text-text-dim">{a.campaign_name}</p>
            )}
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
              <Stat label="Spend" value={fmtEur(a.totaal_spend)} />
              <Stat label="Impr." value={fmtInt(a.totaal_impressions)} />
              <Stat label="CTR" value={fmtPct(a.gem_ctr, 1)} />
              <Stat label="CPC" value={fmtEur(a.gem_cpc)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xs">{value}</p>
    </div>
  );
}

function SocialTab({ data }: { data: SocialPost[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Geen social posts"
        message="Instagram + Facebook organic data komt via Windsor. Koppel de pages en run de ingest."
        hint="bron: v_social_posts"
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <Card key={p.id} hoverable>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={p.platform === "instagram" ? "accent" : "info"}
            >
              {p.platform === "instagram" ? "IG" : "FB"}
            </Badge>
            {p.media_type && (
              <Badge variant="ghost">{p.media_type}</Badge>
            )}
            <span className="ml-auto font-mono text-[10px] text-text-muted">
              {fmtDate(p.posted_at)}
            </span>
          </div>
          <p className="line-clamp-3 text-sm">
            {p.caption_preview ?? "—"}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3">
            <Stat label="Likes" value={fmtInt(p.like_count)} />
            <Stat label="Comments" value={fmtInt(p.comment_count)} />
            <Stat label="Bereik" value={fmtInt(p.reach)} />
            <Stat label="Eng%" value={fmtPct(p.engagement_rate, 1)} />
          </div>
          {p.permalink && (
            <a
              href={p.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-accent hover:underline"
            >
              Open post →
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}

function Ga4Tab({ data }: { data: Ga4Bron[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Geen GA4 data"
        message="GA4 data komt via Windsor. Koppel hegeman.com Search Console en GA4."
        hint="bron: v_ga4_bronnen"
      />
    );
  }
  const totalSessions = data.reduce((s, d) => s + Number(d.sessies ?? 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card-hover/50 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-dim">
            <th className="px-3 py-3">Bron / medium</th>
            <th className="px-3 py-3">Aandeel</th>
            <th className="px-3 py-3 text-right">Sessies</th>
            <th className="px-3 py-3 text-right">Gebruikers</th>
            <th className="px-3 py-3 text-right">Pageviews</th>
            <th className="px-3 py-3 text-right">Gem. duur</th>
            <th className="px-3 py-3 text-right">Bounce</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => {
            const pct = totalSessions
              ? (Number(b.sessies ?? 0) / totalSessions) * 100
              : 0;
            const isHighlight =
              b.bron?.toLowerCase().includes("linkedin") ||
              b.bron?.toLowerCase().includes("google") ||
              b.medium?.toLowerCase().includes("organic");
            return (
              <tr
                key={b.source_medium}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2.5">
                  <span
                    className={
                      isHighlight ? "text-accent" : ""
                    }
                  >
                    {b.bron}
                  </span>
                  <span className="text-text-muted"> / {b.medium}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-card-hover">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-text-dim">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtInt(b.sessies)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtInt(b.gebruikers)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtInt(b.pageviews)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {b.gem_sessieduur_sec
                    ? `${Math.round(Number(b.gem_sessieduur_sec))}s`
                    : "–"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {fmtPct(b.gem_bounce_rate, 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
