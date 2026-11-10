-- SaveSquad · Phase 3: badges, streak freezes, withdrawals with a squad vote.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

-- ─── Streak freezes ──────────────────────────────────────────────────────────
-- Everyone starts with 1. Earn another every 4 on-time weeks in a row (max 3).
-- Using one covers the current week, so a tight week doesn't break your streak.
alter table public.profiles
  add column freezes integer not null default 1 check (freezes between 0 and 3);

create table public.streak_freezes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.streak_freezes enable row level security;
create policy "see own freezes" on public.streak_freezes
  for select to authenticated using (user_id = auth.uid());

-- Streaks now count frozen weeks as on time.
create or replace function public.user_streaks(uids uuid[])
returns table (user_id uuid, current_weeks integer, best_weeks integer, this_week_cents bigint)
language sql
stable
security definer set search_path = ''
as $$
  with allowed as (
    select p.id, p.weekly_target_cents as target
    from public.profiles p
    where p.id = any (uids) and (p.id = auth.uid() or public.shares_squad_with(p.id))
  ),
  weekly as (
    select s.user_id, date_trunc('week', s.created_at at time zone 'UTC')::date as wk,
           sum(s.amount_cents) as cents
    from public.saves s
    join allowed a on a.id = s.user_id
    group by 1, 2
  ),
  met as (
    select w.user_id, w.wk
    from weekly w join allowed a on a.id = w.user_id
    where w.cents >= a.target
    union
    select f.user_id, f.week_start
    from public.streak_freezes f join allowed a on a.id = f.user_id
  ),
  islands as (
    select m.user_id, m.wk,
           m.wk - (7 * row_number() over (partition by m.user_id order by m.wk))::int as grp
    from met m
  ),
  runs as (
    select i.user_id, count(*)::int as len, max(i.wk) as last_wk
    from islands i group by i.user_id, i.grp
  ),
  this_week as (
    select date_trunc('week', now() at time zone 'UTC')::date as wk
  )
  select
    a.id,
    coalesce((
      select r.len from runs r, this_week t
      where r.user_id = a.id and r.last_wk >= t.wk - 7
      order by r.last_wk desc limit 1
    ), 0),
    coalesce((select max(r.len) from runs r where r.user_id = a.id), 0),
    case when a.id = auth.uid() then
      coalesce((select w.cents from weekly w, this_week t where w.user_id = a.id and w.wk = t.wk), 0)
    end
  from allowed a;
$$;

create function public.use_freeze()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  wk date := date_trunc('week', now() at time zone 'UTC')::date;
  target integer;
  this_week bigint;
  left_over integer;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select weekly_target_cents, freezes into target, left_over from public.profiles where id = uid;
  if left_over < 1 then raise exception 'No freezes left'; end if;
  if exists (select 1 from public.streak_freezes where user_id = uid and week_start = wk) then
    raise exception 'This week is already frozen';
  end if;
  select coalesce(sum(amount_cents), 0) into this_week
  from public.saves where user_id = uid and created_at >= wk::timestamp at time zone 'UTC';
  if this_week >= target then raise exception 'This week is already done'; end if;

  insert into public.streak_freezes (user_id, week_start) values (uid, wk);
  update public.profiles set freezes = freezes - 1 where id = uid;
end;
$$;

-- ─── Badges ──────────────────────────────────────────────────────────────────
-- The badge list (names, emoji) lives in src/lib/badges.ts; this table only
-- records who earned what.
create table public.user_badges (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "see own and squadmates' badges" on public.user_badges
  for select to authenticated
  using (user_id = auth.uid() or public.shares_squad_with(user_id));

-- Awards any badges the user has newly earned; returns their ids.
create function public.check_badges(uid uuid)
returns text[]
language plpgsql
security definer set search_path = ''
as $$
declare
  total bigint;
  best integer;
  spins_saved integer;
  cheers_given integer;
  squads_created integer;
  goal_done boolean;
  awarded text[];
begin
  select coalesce(sum(amount_cents), 0) into total from public.saves where user_id = uid;
  select coalesce(max(s.best_weeks), 0) into best from public.user_streaks(array[uid]) s;
  select count(*) into spins_saved from public.spins where user_id = uid and status = 'saved';
  select count(*) into cheers_given from public.cheers where user_id = uid;
  select count(*) into squads_created from public.squads where created_by = uid;
  select exists (
    select 1 from public.goals g
    where g.user_id = uid
      and (select coalesce(sum(amount_cents), 0) from public.saves where goal_id = g.id) >= g.target_cents
  ) into goal_done;

  with earned(badge_id) as (
    select 'first_save' where total > 0
    union all select 'first_100' where total >= 10000
    union all select 'on_a_roll' where best >= 4
    union all select 'quarter_streaker' where best >= 13
    union all select 'lucky_spinner' where spins_saved >= 7
    union all select 'team_player' where cheers_given >= 5
    union all select 'squad_starter' where squads_created >= 1
    union all select 'goal_getter' where goal_done
  ),
  inserted as (
    insert into public.user_badges (user_id, badge_id)
    select uid, e.badge_id from earned e
    on conflict do nothing
    returning user_badges.badge_id
  )
  select coalesce(array_agg(i.badge_id), '{}') into awarded from inserted i;

  return awarded;
end;
$$;

-- For badges earned outside a save (creating a squad, cheering).
create function public.refresh_my_badges()
returns text[]
language sql
security definer set search_path = ''
as $$ select public.check_badges(auth.uid()) $$;

-- ─── record_save: now also awards freezes and badges ─────────────────────────
drop function public.record_save(integer, uuid, uuid, text);

create function public.record_save(
  p_amount_cents integer,
  p_squad_id uuid default null,
  p_goal_id uuid default null,
  p_source text default 'manual'
)
returns table (
  save_id uuid,
  xp_gained integer,
  week_completed boolean,
  earned_freeze boolean,
  new_badges text[]
)
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target integer;
  week_start timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  before_cents bigint;
  sid uuid;
  gained integer;
  completed boolean;
  streak_now integer;
  freeze_earned boolean := false;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 1000000 then
    raise exception 'Amount must be between $0.01 and $10,000';
  end if;
  if (p_squad_id is null) = (p_goal_id is null) then
    raise exception 'Save to either a goal or a squad';
  end if;
  if p_squad_id is not null and not public.is_squad_member(p_squad_id) then
    raise exception 'Not a member of this squad';
  end if;
  if p_goal_id is not null and not exists (
    select 1 from public.goals where id = p_goal_id and user_id = uid
  ) then
    raise exception 'Goal not found';
  end if;
  if p_source not in ('manual', 'spin') then raise exception 'Bad source'; end if;
  if p_source = 'spin' then
    update public.spins set status = 'saved'
    where user_id = uid and day = (now() at time zone 'UTC')::date and status = 'pending';
    if not found then raise exception 'No spin to save today'; end if;
  end if;

  select weekly_target_cents into target from public.profiles where id = uid;
  select coalesce(sum(amount_cents), 0) into before_cents
  from public.saves where user_id = uid and created_at >= week_start;

  insert into public.saves (user_id, squad_id, goal_id, amount_cents, source)
  values (uid, p_squad_id, p_goal_id, p_amount_cents, p_source)
  returning id into sid;

  completed := before_cents < target and before_cents + p_amount_cents >= target;
  gained := case when p_source = 'spin' then 20 else 10 end
            + case when completed then 100 else 0 end;

  update public.profiles
  set xp = xp + gained, level = (xp + gained) / 250 + 1
  where id = uid;

  if completed then
    select s.current_weeks into streak_now from public.user_streaks(array[uid]) s;
    if streak_now > 0 and streak_now % 4 = 0 then
      update public.profiles set freezes = least(freezes + 1, 3) where id = uid and freezes < 3;
      freeze_earned := found;
    end if;
  end if;

  return query select sid, gained, completed, freeze_earned, public.check_badges(uid);
end;
$$;

-- ─── Withdrawals need a squad vote ───────────────────────────────────────────
-- Self-reported like saves: an approved withdrawal lowers the squad's total
-- and means "you can move this money out". Majority of members must approve
-- (the requester counts as a yes). If the squad turned the rule off, requests
-- are approved straight away.
create table public.withdrawals (
  id           uuid primary key default gen_random_uuid(),
  squad_id     uuid not null references public.squads (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  reason       text not null default '' check (char_length(reason) <= 140),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index withdrawals_squad_idx on public.withdrawals (squad_id, created_at desc);

create table public.withdrawal_votes (
  withdrawal_id uuid not null references public.withdrawals (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  approve       boolean not null,
  created_at    timestamptz not null default now(),
  primary key (withdrawal_id, user_id)
);

alter table public.withdrawals enable row level security;
alter table public.withdrawal_votes enable row level security;
create policy "members see withdrawals" on public.withdrawals
  for select to authenticated using (public.is_squad_member(squad_id));
create policy "members see votes" on public.withdrawal_votes
  for select to authenticated
  using (exists (
    select 1 from public.withdrawals w
    where w.id = withdrawal_id and public.is_squad_member(w.squad_id)
  ));

create function public.resolve_withdrawal(wid uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  sid uuid;
  members integer;
  n_yes integer;
  n_no integer;
  result text := 'pending';
begin
  select squad_id into sid from public.withdrawals where id = wid;
  select count(*) into members from public.squad_members where squad_id = sid;
  select count(*) filter (where approve), count(*) filter (where not approve)
    into n_yes, n_no
  from public.withdrawal_votes where withdrawal_id = wid;

  if n_yes * 2 > members then result := 'approved';
  elsif n_no * 2 >= members then result := 'rejected';
  end if;

  if result <> 'pending' then
    update public.withdrawals set status = result, resolved_at = now()
    where id = wid and status = 'pending';
  end if;
  return result;
end;
$$;

create function public.request_withdrawal(p_squad_id uuid, p_amount_cents integer, p_reason text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  balance bigint;
  needs_vote boolean;
  wid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not public.is_squad_member(p_squad_id) then raise exception 'Not a member of this squad'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'Enter an amount'; end if;

  select
    (select coalesce(sum(amount_cents), 0) from public.saves where squad_id = p_squad_id)
    - (select coalesce(sum(amount_cents), 0) from public.withdrawals
       where squad_id = p_squad_id and status = 'approved')
  into balance;
  if p_amount_cents > balance then raise exception 'That''s more than the squad has saved'; end if;

  select withdrawals_need_vote into needs_vote from public.squads where id = p_squad_id;

  insert into public.withdrawals (squad_id, requested_by, amount_cents, reason, status, resolved_at)
  values (
    p_squad_id, uid, p_amount_cents, coalesce(left(p_reason, 140), ''),
    case when needs_vote then 'pending' else 'approved' end,
    case when needs_vote then null else now() end
  )
  returning id into wid;

  if needs_vote then
    insert into public.withdrawal_votes (withdrawal_id, user_id, approve) values (wid, uid, true);
    perform public.resolve_withdrawal(wid);
  end if;
  return wid;
end;
$$;

create function public.vote_withdrawal(p_withdrawal_id uuid, p_approve boolean)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  st text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select squad_id, status into sid, st from public.withdrawals where id = p_withdrawal_id;
  if sid is null or not public.is_squad_member(sid) then raise exception 'Not found'; end if;
  if st <> 'pending' then raise exception 'Voting is closed'; end if;

  insert into public.withdrawal_votes (withdrawal_id, user_id, approve)
  values (p_withdrawal_id, uid, p_approve)
  on conflict (withdrawal_id, user_id) do update set approve = excluded.approve, created_at = now();

  return public.resolve_withdrawal(p_withdrawal_id);
end;
$$;

-- ─── Function permissions ────────────────────────────────────────────────────
revoke execute on function public.check_badges(uuid) from anon, authenticated, public;
revoke execute on function public.resolve_withdrawal(uuid) from anon, authenticated, public;
revoke execute on function public.use_freeze() from anon, public;
revoke execute on function public.refresh_my_badges() from anon, public;
revoke execute on function public.record_save(integer, uuid, uuid, text) from anon, public;
revoke execute on function public.request_withdrawal(uuid, integer, text) from anon, public;
revoke execute on function public.vote_withdrawal(uuid, boolean) from anon, public;
grant execute on function public.use_freeze() to authenticated;
grant execute on function public.refresh_my_badges() to authenticated;
grant execute on function public.record_save(integer, uuid, uuid, text) to authenticated;
grant execute on function public.request_withdrawal(uuid, integer, text) to authenticated;
grant execute on function public.vote_withdrawal(uuid, boolean) to authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.withdrawals;
alter publication supabase_realtime add table public.withdrawal_votes;
