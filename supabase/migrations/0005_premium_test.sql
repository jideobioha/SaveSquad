-- SaveSquad · Pricing test: "Join the Premium waitlist" card on Challenges.
-- No payment. One row per person per price, so changing the price starts a
-- clean count. Run once in Supabase → SQL Editor → New query → paste → Run.
-- Results: supabase/queries/premium_test_results.sql

create table public.premium_interest (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  price_cents   integer not null check (price_cents between 1 and 100000),
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  views         integer not null default 1,
  joined_at     timestamptz,
  primary key (user_id, price_cents)
);

alter table public.premium_interest enable row level security;
create policy "see your own premium interest" on public.premium_interest
  for select to authenticated using (user_id = auth.uid());

-- The card was on screen.
create function public.premium_seen(p_price_cents integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.premium_interest (user_id, price_cents)
  values (auth.uid(), p_price_cents)
  on conflict (user_id, price_cents) do update
    set views = public.premium_interest.views + 1, last_seen_at = now();
end;
$$;

-- The button was tapped. Only the first tap's time is kept.
create function public.join_premium_waitlist(p_price_cents integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.premium_interest (user_id, price_cents, joined_at)
  values (auth.uid(), p_price_cents, now())
  on conflict (user_id, price_cents) do update
    set joined_at = coalesce(public.premium_interest.joined_at, now());
end;
$$;

revoke execute on function public.premium_seen(integer) from anon, public;
revoke execute on function public.join_premium_waitlist(integer) from anon, public;
grant execute on function public.premium_seen(integer) to authenticated;
grant execute on function public.join_premium_waitlist(integer) to authenticated;
