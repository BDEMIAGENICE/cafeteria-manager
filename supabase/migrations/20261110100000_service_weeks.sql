-- A plan for each week: which days the café opens can change from one week to the next
-- (this week Tuesday and Thursday, next week Monday, Wednesday and Friday, the one after
-- every day).
--
--   service_weeks   one row per planned week, identified by its Monday. `days` lists the
--                   open days of that week: [{ "weekday": 2, "time_label": "12:15–13:30",
--                   "needed": 2 }, …] (weekday 1 = Monday … 7 = Sunday). An empty list is a
--                   week that is shut.
--
-- The service of a date is, in this order: its exception in service_days if it has one,
-- else its week's plan if the week has one, else its weekday's usual hours in
-- opening_hours. A week with no row follows the usual hours, so nothing changes until an
-- admin plans a week, and weeks far ahead keep working without being planned.

create table if not exists public.service_weeks (
  week_start date  primary key check (extract(isodow from week_start) = 1),
  days       jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array')
);

-- Same access as the other schedule tables: staff read, admins edit, nothing for visitors
-- (they go through public_opening() below).
alter table public.service_weeks enable row level security;
revoke all on public.service_weeks from anon;

drop policy if exists staff_read on public.service_weeks;
drop policy if exists admin_write on public.service_weeks;
create policy staff_read on public.service_weeks for select to authenticated using (public.is_staff());
create policy admin_write on public.service_weeks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Public opening page (public-opening/): follows the same rule as the app.
--
--   open:       whether the café opens that day
--   time_label: its hours, null when closed
--   special:    the day differs from what its week plans (closed on a planned day, open on
--               an unplanned one, or other hours), because an admin set an exception for
--               that date. A week's own plan is not "special": it is the schedule.
--
-- Returns the coming `days` days (1 to 90, from today in Paris). Nothing about staff or
-- sign-ups leaves the database.
create or replace function public.public_opening(days int default 28)
returns table (date date, open boolean, time_label text, special boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with span as (
    select ((now() at time zone 'Europe/Paris')::date + i) as day
    from generate_series(0, least(greatest(coalesce(days, 28), 1), 90) - 1) as i
  ),
  planned as (
    -- the hours the week gives that day: its own plan if it has one, else the usual hours
    select
      span.day,
      case
        when sw.week_start is not null then (
          select p.time_label
          from jsonb_to_recordset(sw.days) as p(weekday int, time_label text)
          where p.weekday = extract(isodow from span.day)::int
          limit 1
        )
        else oh.time_label
      end as label
    from span
    left join public.service_weeks sw
      on sw.week_start = span.day - (extract(isodow from span.day)::int - 1)
    left join public.opening_hours oh
      on oh.weekday = extract(isodow from span.day)
  )
  select
    planned.day,
    hours.label is not null,
    hours.label,
    hours.label is distinct from planned.label
  from planned
  left join public.service_days sd on sd.date = planned.day
  cross join lateral (
    select case when sd.closed then null else coalesce(sd.time_label, planned.label) end as label
  ) as hours
  order by planned.day
$$;

revoke all on function public.public_opening(int) from public;
grant execute on function public.public_opening(int) to anon, authenticated;
