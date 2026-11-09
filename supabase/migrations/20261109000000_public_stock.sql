-- Public stock page (public-stock/): what the café has, readable without signing in.
-- The products table stays staff-only. This function is the only way in for visitors,
-- and it returns only what the page shows: never the purchase cost, the weekly usage
-- or ids.
--
--   status: 'out' when nothing is left, 'low' at or under the minimum level, else 'ok'
--   price:  the selling price, null when none is set

create or replace function public.public_stock()
returns table (name text, category text, quantity numeric, status text, price numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.name,
    nullif(trim(p.category), ''),
    p.current,
    case
      when p.current <= 0 then 'out'
      when p.current <= p.min_level then 'low'
      else 'ok'
    end,
    nullif(p.price, 0)
  from public.products p
  order by nullif(trim(p.category), '') nulls last, p.name
$$;

revoke all on function public.public_stock() from public;
grant execute on function public.public_stock() to anon, authenticated;
