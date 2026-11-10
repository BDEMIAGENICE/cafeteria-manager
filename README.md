# Cafet'MIAGE — Cafeteria Manager

Staff schedule, stock room and admin for a student-organisation café. React + Vite on the front, Supabase for the database.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

## Database

The schema and seed data live in `supabase/migrations/`. Run them in the Supabase SQL editor (or with the Supabase CLI), in file-name order. After changing `supabase/functions/calendar-sync/`, redeploy that function.

## Opening days, week by week

The café doesn't open the same days every week. Each week (Monday to Sunday) can have its own plan: this week Tuesday and Thursday, next week Monday, Wednesday and Friday, the one after every day. Admins set it from **Planning → Plan this week**; each open day has its own hours and head count.

For a given date the schedule uses, in this order: the date's own exception (**Edit this day**: closed, or other hours), the plan of its week, the usual hours (**Usual hours**, a weekday template). A week with no plan follows the usual hours, so nothing changes until a week is planned. Plans live in `service_weeks` (`supabase/migrations/20261110100000_service_weeks.sql`), and the rule lives in `servicesFrom()` (`supabase/functions/calendar-sync/core.js`), used by the app and the calendar sync; the public page applies the same rule in SQL (`public_opening()`).

## Public page (no sign-in)

`/cafet/` (`public-cafet/`) is one static page, built with the site, with two tabs. It reads the database through functions that return only what the tabs show:

- **Jours d'ouverture**: the opening days of the next four weeks.
- **Stock**: the stock room. Not real time: the team updates it by hand at the start of each service, and the tab says so.

`/cafet/#horaires` and `/cafet/#stock` open a tab directly, and `/cafet/?ecran` is the stock-only screen for in front of the café. The earlier addresses `/horaires/` and `/stock/` redirect to the matching tab.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`). Set the repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` first.
