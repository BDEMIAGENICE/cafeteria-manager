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

The page is in French and English (FR / EN buttons at the top; the choice is kept on the device, and a first visit follows the browser's language). Texts live in `public-cafet/i18n.js`. The screen in front of the café stays in French. Switching tab is animated, and when the stock tab comes up its cards rise one after the other while each quantity counts up from 0 (only on arrival, not on the 30-second refreshes). All of it is off when the system asks for reduced motion.

## Animations (app)

`src/motion.css` holds all the motion of the app, loaded last so it only adds to the other stylesheets: screens, lists, calendar days and dialogs come in one after the other, buttons and cards answer on hover and press, Michel floats. The figures of the stock screen count up with `src/CountUp.jsx`. Entrances use `animation-fill-mode: backwards` on purpose, so nothing keeps a transform once it has played (hover effects keep working, and the `position: fixed` dialogs are not trapped in a transformed parent). Everything is off under `prefers-reduced-motion`.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`). Set the repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` first.
