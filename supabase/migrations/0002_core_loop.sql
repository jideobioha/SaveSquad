-- SaveSquad · Phase 2: personal goals, one streak per person, spins, XP,
-- squad posts (shared wins, nudges).
-- Run once in Supabase → SQL Editor → New query → paste → Run.

-- ─── One weekly target per person (was per squad) ────────────────────────────
alter table public.profiles
  add column weekly_target_cents integer not null default 1000 check (weekly_target_cents > 0),
  add column onboarded boolean not null default false;

-- Carry over what people already set in their squads.
update public.profiles p
set weekly_target_cents = m.target
from (
  select user_id, max(weekly_target_cents) as target
  from public.squad_members
  group by user_id
) m
where m.user_id = p.id;

alter table public.squad_members drop column weekly_target_cents;

-- Users may edit their name, color, weekly target and onboarding flag,
-- but not XP or level (those only change through record_save below).
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_color, weekly_target_cents, onboarded)
  on public.profiles to authenticated;

-- ─── Personal goals ("What are you saving for?") ─────────────────────────────
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('trip', 'emergency', 'down_payment', 'other')),
  name         text not null check (char_length(name) between 1 and 60),
  target_cents integer not null check (target_cents > 0),
  deadline     date not null,
  created_at   timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, created_at desc);

alter table public.goals enable row level security;
create policy "own goals" on public.goals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A save goes to exactly one place: your goal or a squad.
alter table public.saves
  add column goal_id uuid references public.goals (id) on delete cascade,
  add constraint saves_one_destination check ((goal_id is null) <> (squad_id is null));

-- ─── Daily spins ─────────────────────────────────────────────────────────────
create table public.spins (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day          date not null,
  amount_cents integer not null,
  status       text not null default 'pending' check (status in ('pending', 'saved')),
  created_at   timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.spins enable row level security;
create policy "see own spins" on public.spins
  for select to authenticated using (user_id = auth.uid());

-- The wheel. The client draws the same list, in the same order.
create function public.spin_amounts()
returns integer[]
language sql immutable
as $$ select array[500, 1000, 2000, 300, 1200, 800, 1500, 2500] $$;

-- One spin per day (UTC). Returns today's spin, creating it if needed,
-- so refreshing can't reroll.
create function public.spin_today()
returns table (amount_cents integer, status text, segment integer)
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  amounts integer[] := public.spin_amounts();
  pick integer;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  pick := 1 + floor(random() * array_length(amounts, 1))::int;
  insert into public.spins (user_id, day, amount_cents)
  values (uid, today, amounts[pick])
  on conflict (user_id, day) do nothing;
  return query
    select s.amount_cents, s.status, array_position(amounts, s.amount_cents) - 1
    from public.spins s
    where s.user_id = uid and s.day = today;
end;
$$;

-- ─── Recording a save (the only way saves and XP are written) ────────────────
-- XP: +10 per save, +20 if it came from the daily spin, +100 bonus for the
-- save that completes your weekly target. 250 XP per level.
drop policy "add own saves" on public.saves;

create function public.record_save(
  p_amount_cents integer,
  p_squad_id uuid default null,
  p_goal_id uuid default null,
  p_source text default 'manual'
)
returns table (save_id uuid, xp_gained integer, week_completed boolean)
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

  return query select sid, gained, completed;
end;
$$;

-- ─── Streaks (one per person, across every save) ─────────────────────────────
-- A week (Mon–Sun, UTC) is on time when your saves reach your weekly target.
-- The current week doesn't break a streak until it's over. Squadmates can
-- see each other's streak counts, but this-week amounts only for yourself.
create function public.user_streaks(uids uuid[])
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

-- ─── Squad posts: shared wins and nudges in the activity feed ────────────────
create table public.squad_posts (
  id             uuid primary key default gen_random_uuid(),
  squad_id       uuid not null references public.squads (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null check (kind in ('streak', 'nudge')),
  streak_weeks   integer,
  target_user_id uuid references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index squad_posts_squad_idx on public.squad_posts (squad_id, created_at desc);

alter table public.squad_posts enable row level security;
create policy "members see posts" on public.squad_posts
  for select to authenticated using (public.is_squad_member(squad_id));
create policy "members post as themselves" on public.squad_posts
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_squad_member(squad_id));

-- ─── Function permissions ────────────────────────────────────────────────────
revoke execute on function public.spin_today() from anon, public;
revoke execute on function public.record_save(integer, uuid, uuid, text) from anon, public;
revoke execute on function public.user_streaks(uuid[]) from anon, public;
grant execute on function public.spin_today() to authenticated;
grant execute on function public.record_save(integer, uuid, uuid, text) to authenticated;
grant execute on function public.user_streaks(uuid[]) to authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.squad_posts;
alter publication supabase_realtime add table public.cheers;
