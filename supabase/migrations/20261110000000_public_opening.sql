-- Public opening page (public-opening/): which days the café opens, readable without
-- signing in. It returns every day of the coming `days` days (1 to 90, from today in
-- Paris), with the same rule as the app: a date's exception if it has one, else its
-- weekday's usual hours. Nothing about staff or sign-ups leaves the database.
--
--   open:       whether the café opens that day
--   time_label: its hours, null when closed
--   special:    the day differs from its weekday's usual hours (closed or open on an
--               unusual day, or other hours), because an admin set an exception

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
  )
  select
    span.day,
    hours.label is not null,
    hours.label,
    hours.label is distinct from oh.time_label
  from span
  left join public.opening_hours oh on oh.weekday = extract(isodow from span.day)
  left join public.service_days sd on sd.date = span.day
  cross join lateral (
    select case when sd.closed then null else coalesce(sd.time_label, oh.time_label) end as label
  ) as hours
  order by span.day
$$;

revoke all on function public.public_opening(int) from public;
grant execute on function public.public_opening(int) to anon, authenticated;
