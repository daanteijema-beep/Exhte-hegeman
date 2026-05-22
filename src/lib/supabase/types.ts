export type DashboardStats = {
  actieve_vacatures: number | null;
  vacatures_lang_open: number | null;
  totaal_kandidaten: number | null;
  actieve_placements: number | null;
  posts_afgelopen_30d: number | null;
  gem_bereik_30d: number | null;
  ads_spend_30d: number | null;
  gem_ctr_30d: number | null;
  competitor_open_vacatures: number | null;
  laatste_succesvolle_ingest: string | null;
};

export type Insight = {
  agent: string;
  topic: string | null;
  summary: string;
  confidence: string | null;
  generated_at: string | null;
};

export type Vacature = {
  id: string;
  origin: string;
  title: string;
  location: string | null;
  status: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  published_at: string | null;
  url: string | null;
  department: string | null;
  wz_clicks: number | null;
  wz_applications: number | null;
  wz_application_starts: number | null;
  wz_avg_position: number | null;
  wz_cost: number | null;
  rc_placements: number | null;
  rc_qualified: number | null;
  dagen_open: number | null;
};

export type Campagne = {
  campaign_id: string;
  campaign_name: string;
  eerste_dag: string | null;
  laatste_dag: string | null;
  actieve_dagen: number | null;
  totaal_spend: number | null;
  totaal_impressions: number | null;
  totaal_clicks: number | null;
  totaal_reach: number | null;
  gem_ctr: number | null;
  gem_cpc: number | null;
  gem_cpm: number | null;
};

export type Ad = {
  id: string;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  campaign_objective: string | null;
  status: string | null;
  creative_body: string | null;
  creative_title: string | null;
  creative_image_url: string | null;
  start_time: string | null;
  stop_time: string | null;
  totaal_spend: number | null;
  totaal_impressions: number | null;
  totaal_clicks: number | null;
  gem_ctr: number | null;
  gem_cpc: number | null;
};

export type SocialPost = {
  id: string;
  platform: string;
  media_type: string | null;
  media_product_type: string | null;
  caption_preview: string | null;
  permalink: string | null;
  media_url: string | null;
  posted_at: string | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  impressions: number | null;
  reach: number | null;
  engagement_rate: number | null;
};

export type Ga4Bron = {
  source_medium: string;
  bron: string | null;
  medium: string | null;
  eerste_dag: string | null;
  laatste_dag: string | null;
  sessies: number | null;
  gebruikers: number | null;
  gem_bounce_rate: number | null;
  gem_sessieduur_sec: number | null;
  pageviews: number | null;
};

export type KandidaatFunnel = {
  vacature: string;
  location: string | null;
  vacature_status: string | null;
  stage: string;
  aantal: number | null;
  gediskwalificeerd: number | null;
  eerste_kandidaat: string | null;
  laatste_kandidaat: string | null;
};

export type KandidaatBron = {
  herkomst: string;
  kandidaten: number | null;
  vacatures_gesolliciteerd: number | null;
  gediskwalificeerd: number | null;
  actief: number | null;
  eerste: string | null;
  laatste: string | null;
};

export type Competitor = {
  short_name: string;
  formal_name: string;
  open_vacatures: number | null;
  totaal_ooit_gezien: number | null;
  eerste_vacature: string | null;
  laatste_update: string | null;
  open_titels: string[] | null;
};

export type CompetitorVacature = {
  id: string;
  competitor: string;
  title: string;
  location: string | null;
  url: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_currently_open: boolean | null;
};

export type WerkzoekenTijdreeks = {
  vacancy_id: string;
  title: string;
  metric_date: string;
  clicks: number | null;
  applications: number | null;
};

export type BrandosSource = {
  id: string;
  label: string;
  kind: string;
  provider: string | null;
  status: string;
  account_id: string | null;
  notes: string | null;
  created_at: string | null;
};

export type IngestionRun = {
  id: string;
  source_id: string;
  started_at: string | null;
  finished_at: string | null;
  status: string | null;
  rows_upserted: number | null;
  error: string | null;
};

export type AgentInstruction = {
  id: number;
  title: string;
  instruction: string;
  scope: string;
  active: boolean | null;
  updated_at: string | null;
};

export type ApiEndpoint = {
  id: number;
  method: string;
  path: string;
  description: string;
  category: string;
  enabled: boolean | null;
};
