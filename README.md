# Hegeman BrandOS

Employer brand intelligence dashboard — Next.js 16 + Supabase.

## Stack

- Next.js 16 (App Router, React Server Components)
- React 19.2 + TypeScript strict
- Tailwind v4 met `@theme` tokens
- Supabase project: `vttmtslwqrpwqxjnenso` (eu-west-1, Postgres 17)
- Hosted op Vercel

## Lokaal draaien

```bash
cp .env.example .env.local   # vul de waarden in
npm install
npm run dev
```

Open http://localhost:3000 → redirect naar `/brandos`.

## Pagina's

| Route | Doel |
|---|---|
| `/brandos` | Totaaloverzicht — kernindicatoren + recente AI insights |
| `/brandos/campagnes` | Meta Ads campagnes, ads, social, GA4 verkeer |
| `/brandos/vacatures` | Recruitee + Werkzoeken vacatures gecombineerd |
| `/brandos/concurrentie` | BAM / Heijmans / Dura Vermeer / AM open vacatures |
| `/brandos/recruitee` | Kandidaat funnel + herkomst + activiteit |
| `/brandos/bedrijf` | Bronnen, ingest triggers, agent instructies, endpoints |

## Ingest API routes

- `POST /api/ingest/werkzoeken` — `api.werkzoeken.nl`
- `POST /api/ingest/recruitee` — `api.recruitee.com/c/129883`
- `POST /api/ingest/competitors` — Dura Vermeer BFF + Heijmans JSON-LD + BAM Phenom

Elke run wordt geaudit in `brandos_ingestion_runs`. Trigger handmatig via knoppen op `/brandos/bedrijf`.

## Supabase schema

18 tabellen (`brandos_*`) en 12 views (`v_*`). Pagina's gebruiken uitsluitend de views. Schema staat in het Supabase project zelf — niet in deze repo.

## Architectuur

- Server components voor data fetching (service role key, alleen server)
- Client components alleen voor interactie (tabs, filters, edit-instructies)
- `@/lib/supabase/server.ts` — service role client
- `@/lib/supabase/client.ts` — anon client (browser)
- `@/lib/ingest.ts` — `openIngestionRun` / `closeIngestionRun` helpers
- `@/lib/format.ts` — nl-NL formatting helpers

## Design

Donker theme:
- `#0a0a0b` background, `#111113` cards, `#222228` borders
- Accent `#ff5c35` (oranje-rood), positive `#2ecc71`, negative `#ef4444`
- Syne (display) + DM Mono (cijfers/labels) + Inter (body)
- Alle stats in tabular-nums

## Env vars

Zie `.env.example`. Allemaal vereist:

- `NEXT_PUBLIC_SUPABASE_URL` — voor browser RPC
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon, voor edits via client
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, voor RSC queries
- `RECRUITEE_COMPANY_ID`, `RECRUITEE_API_TOKEN` — voor `/api/ingest/recruitee`
- `WERKZOEKEN_API_TOKEN`, `WERKZOEKEN_COMPANY_ID` — voor `/api/ingest/werkzoeken`

## Bekende follow-ups

Uit Supabase advisors:
- 12× `SECURITY DEFINER` views → migration naar `security_invoker=true`
- 3× tabellen met RLS aan maar zonder policies
- 6× ontbrekende FK indexes
