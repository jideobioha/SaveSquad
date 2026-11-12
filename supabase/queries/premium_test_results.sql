-- SaveSquad · Premium waitlist test results. Read-only; run any time in
-- Supabase → SQL Editor. "Saw it" = people who had the card on screen.

-- Summary per price
select
  price_cents / 100.0                                   as price_per_month,
  count(*)                                              as people_saw_it,
  count(joined_at)                                      as people_tapped,
  round(100.0 * count(joined_at) / count(*), 1)         as tap_rate_pct,
  sum(views)                                            as total_views
from public.premium_interest
group by price_cents
order by price_cents;

-- Per person (who tapped, and how many views it took)
-- select p.display_name, i.views, i.first_seen_at, i.joined_at
-- from public.premium_interest i join public.profiles p on p.id = i.user_id
-- order by i.joined_at nulls last, i.first_seen_at;
