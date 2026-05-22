-- v_dashboard_stats: Recruitee als master, GA4 dagen_online als tijd-as.
-- Was: actieve_vacatures telde Recruitee published + Werkzoeken open (=dubbel,
--      want WZ is een doorpost van Recruitee). En lang_open gebruikte
--      Recruitee published_at, wat fout is omdat Recruitee re-publisht in batch.
create or replace view public.v_dashboard_stats as
select
  (select count(*) from v_vacatures_with_urgency where status = 'published') as actieve_vacatures,
  (select count(*) from v_vacatures_with_urgency
    where status = 'published' and dagen_online > 60) as vacatures_lang_open,
  (select count(*) from brandos_candidates) as totaal_kandidaten,
  (select count(*) from brandos_placements where disqualified = false) as actieve_placements,
  (select count(*) from brandos_social_posts where posted_at > now() - interval '30 days') as posts_afgelopen_30d,
  (select round(avg(reach), 0) from brandos_social_posts where posted_at > now() - interval '30 days') as gem_bereik_30d,
  (select round(sum(value), 2) from brandos_metrics_daily
    where source_id = 'facebook_ads' and metric = 'spend' and metric_date > now() - interval '30 days') as ads_spend_30d,
  (select round(avg(value), 4) from brandos_metrics_daily
    where source_id = 'facebook_ads' and metric = 'ctr' and metric_date > now() - interval '30 days') as gem_ctr_30d,
  (select count(*) from brandos_competitor_vacancies where is_currently_open = true) as competitor_open_vacatures,
  (select max(started_at)::date from brandos_ingestion_runs where status = 'success') as laatste_succesvolle_ingest;

comment on view public.v_dashboard_stats is
  'Hub KPI strip. actieve_vacatures = Recruitee published (master). lang_open meet via GA4 dagen_online (eerste pageview), niet Recruitee published_at.';
