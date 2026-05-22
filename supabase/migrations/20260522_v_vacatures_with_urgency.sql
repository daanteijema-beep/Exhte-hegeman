-- Voegt windowed pageview-metrics toe per Recruitee-vacature.
-- Hangt aan v_vacatures via dezelfde URL-slug match. Trend = 14d vs voorgaande 14d.
create or replace view public.v_vacatures_with_urgency as
with rc_slugs as (
  select v.id,
         nullif(regexp_replace(v.url, '^.*/o/', ''), v.url) as slug
  from brandos_vacancies v
  where v.origin = 'recruitee' and v.url is not null
),
ga_window as (
  select md.entity_id as landing,
         sum(case when md.metric_date >= current_date - interval '14 days'
                  then md.value else 0 end) as pv_last_14d,
         sum(case when md.metric_date <  current_date - interval '14 days'
                   and md.metric_date >= current_date - interval '28 days'
                  then md.value else 0 end) as pv_prev_14d
  from brandos_metrics_daily md
  where md.source_id = 'ga4'
    and md.entity_type = 'landing_page'
    and md.metric = 'screen_page_views'
    and md.metric_date >= current_date - interval '28 days'
  group by md.entity_id
),
ga_per_vacancy as (
  select s.id as vacancy_id,
         sum(g.pv_last_14d) as pv_last_14d,
         sum(g.pv_prev_14d) as pv_prev_14d
  from rc_slugs s
  join ga_window g on g.landing ilike '%' || s.slug || '%'
  group by s.id
),
desc_meta as (
  select id, length(coalesce(description, '')) as description_length
  from brandos_vacancies
  where origin = 'recruitee'
)
select v.*,
       coalesce(gw.pv_last_14d, 0) as pv_last_14d,
       coalesce(gw.pv_prev_14d, 0) as pv_prev_14d,
       case when coalesce(gw.pv_prev_14d, 0) = 0 then null
            else round(((coalesce(gw.pv_last_14d, 0) - gw.pv_prev_14d)::numeric
                        / nullif(gw.pv_prev_14d, 0)) * 100, 1)
       end as trend_pct_14d,
       coalesce(d.description_length, 0) as description_length
from v_vacatures v
left join ga_per_vacancy gw on gw.vacancy_id = v.id
left join desc_meta d on d.id = v.id;

comment on view public.v_vacatures_with_urgency is
  'V1 Hub bron — v_vacatures + windowed GA4 pageviews (14d/prev 14d) + trend% + description_length.';
