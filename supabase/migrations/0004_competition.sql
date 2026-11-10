-- SaveSquad · Phase 4: weekly squad leagues, 1-on-1 friend duels,
-- multiple solo goals.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

-- ─── Multiple goals: pick a main one ─────────────────────────────────────────
-- The main goal is the one on your Home card and where Spin the Save goes.
-- Empty means "your most recent goal".
alter table public.profiles
  add column primary_goal_id uuid references public.goals (id) on delete set null;

create function public.set_primary_goal(p_goal_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.goals where id = p_goal_id and user_id = auth.uid()) then
    raise exception 'Goal not found';
  end if;
  update public.profiles set primary_goal_id = p_goal_id where id = auth.uid();
end;
$$;

-- ─── Weekly squad leagues ────────────────────────────────────────────────────
-- Every squad that opted in ("Join the Squad League") is ranked by the share
-- of its members who are on time this week (hit their weekly target, or used
-- a freeze). Consistency, not cash: amounts never enter the score.
create function public.league_standings()
returns table (squad_id uuid, name text, members integer, on_time integer, is_mine boolean)
language sql
stable
security definer set search_path = ''
as $$
  with this_week as (
    select date_trunc('week', now() at time zone 'UTC')::date as wk
  ),
  league as (
    select s.id, s.name from public.squads s where s.join_league
  ),
  mem as (
    select m.squad_id, m.user_id, p.weekly_target_cents as target
    from public.squad_members m
    join public.profiles p on p.id = m.user_id
    join league l on l.id = m.squad_id
  ),
  week_saves as (
    select s.user_id, sum(s.amount_cents) as cents
    from public.saves s, this_week t
    where s.created_at >= t.wk::timestamp at time zone 'UTC'
    group by s.user_id
  ),
  frozen as (
    select f.user_id from public.streak_freezes f, this_week t where f.week_start = t.wk
  )
  select
    l.id,
    l.name,
    count(m.user_id)::int,
    count(m.user_id) filter (
      where coalesce(ws.cents, 0) >= m.target or fz.user_id is not null
    )::int,
    public.is_squad_member(l.id)
  from league l
  join mem m on m.squad_id = l.id
  left join week_saves ws on ws.user_id = m.user_id
  left join frozen fz on fz.user_id = m.user_id
  group by l.id, l.name;
$$;

-- ─── 1-on-1 friend duels ─────────────────────────────────────────────────────
-- Challenge a squadmate to a week-long habit ("No-delivery week"). Each day
-- you kept it, you check in. Most days by Sunday wins; the loser funds the
-- winner's goal with the stake (self-reported, like everything else).
create table public.duels (
  id           uuid primary key default gen_random_uuid(),
  challenger   uuid not null references public.profiles (id) on delete cascade,
  opponent     uuid not null references public.profiles (id) on delete cascade,
  challenge    text not null check (char_length(challenge) between 1 and 60),
  stake_cents  integer not null default 500 check (stake_cents between 0 and 10000),
  week_start   date not null,
  status       text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  loser_paid   boolean not null default false,
  created_at   timestamptz not null default now(),
  check (challenger <> opponent)
);
create index duels_challenger_idx on public.duels (challenger, week_start desc);
create index duels_opponent_idx on public.duels (opponent, week_start desc);

create table public.duel_checkins (
  duel_id    uuid not null references public.duels (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id, day)
);

alter table public.duels enable row level security;
alter table public.duel_checkins enable row level security;
create policy "duelists see their duels" on public.duels
  for select to authenticated using (auth.uid() in (challenger, opponent));
create policy "duelists see check-ins" on public.duel_checkins
  for select to authenticated
  using (exists (
    select 1 from public.duels d
    where d.id = duel_id and auth.uid() in (d.challenger, d.opponent)
  ));

create function public.create_duel(p_opponent uuid, p_challenge text, p_stake_cents integer)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  did uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_opponent = uid then raise exception 'You can''t duel yourself'; end if;
  if not public.shares_squad_with(p_opponent) then
    raise exception 'You can only duel someone in one of your squads';
  end if;
  insert into public.duels (challenger, opponent, challenge, stake_cents, week_start)
  values (
    uid, p_opponent, trim(p_challenge), coalesce(p_stake_cents, 500),
    date_trunc('week', now() at time zone 'UTC')::date
  )
  returning id into did;
  return did;
end;
$$;

create function public.respond_duel(p_duel_id uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.duels
  set status = case when p_accept then 'active' else 'declined' end
  where id = p_duel_id and opponent = auth.uid() and status = 'pending'
    and week_start = date_trunc('week', now() at time zone 'UTC')::date;
  if not found then raise exception 'This duel can''t be answered anymore'; end if;
end;
$$;

create function public.check_in_duel(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'UTC')::date;
begin
  if not exists (
    select 1 from public.duels d
    where d.id = p_duel_id and auth.uid() in (d.challenger, d.opponent)
      and d.status = 'active' and today between d.week_start and d.week_start + 6
  ) then
    raise exception 'This duel isn''t running';
  end if;
  insert into public.duel_checkins (duel_id, user_id, day)
  values (p_duel_id, auth.uid(), today)
  on conflict do nothing;
end;
$$;

create function public.mark_duel_paid(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.duels set loser_paid = true
  where id = p_duel_id and auth.uid() in (challenger, opponent) and status = 'active'
    and week_start + 7 <= (now() at time zone 'UTC')::date;
  if not found then raise exception 'This duel isn''t finished yet'; end if;
end;
$$;

-- ─── Function permissions ────────────────────────────────────────────────────
revoke execute on function public.set_primary_goal(uuid) from anon, public;
revoke execute on function public.league_standings() from anon, public;
revoke execute on function public.create_duel(uuid, text, integer) from anon, public;
revoke execute on function public.respond_duel(uuid, boolean) from anon, public;
revoke execute on function public.check_in_duel(uuid) from anon, public;
revoke execute on function public.mark_duel_paid(uuid) from anon, public;
grant execute on function public.set_primary_goal(uuid) to authenticated;
grant execute on function public.league_standings() to authenticated;
grant execute on function public.create_duel(uuid, text, integer) to authenticated;
grant execute on function public.respond_duel(uuid, boolean) to authenticated;
grant execute on function public.check_in_duel(uuid) to authenticated;
grant execute on function public.mark_duel_paid(uuid) to authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.duels;
alter publication supabase_realtime add table public.duel_checkins;
