-- SaveSquad · Phase 1: profiles, squads, members, saves, cheers.
-- Run this once in Supabase → SQL Editor → New query → paste → Run.

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_color text not null default '#5b3ff0',
  xp           integer not null default 0,
  level        integer not null default 1,
  created_at   timestamptz not null default now()
);

-- Every new auth user gets a profile row automatically.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  colors text[] := array['#5b3ff0', '#ff6b2c', '#22a06b', '#e5487a', '#2f80ed', '#f2b01e'];
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    colors[1 + floor(random() * array_length(colors, 1))::int]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Squads ──────────────────────────────────────────────────────────────────
create table public.squads (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 60),
  target_cents        integer not null check (target_cents > 0),
  deadline            date not null,
  contribution_mode   text not null default 'anytime'
                        check (contribution_mode in ('anytime', 'equal_split', 'weekly_auto')),
  withdrawals_need_vote boolean not null default true,
  show_amounts        boolean not null default true,
  join_league         boolean not null default true,
  invite_code         text not null unique default substr(md5(random()::text), 1, 8),
  created_by          uuid not null references public.profiles (id),
  created_at          timestamptz not null default now()
);

create table public.squad_members (
  squad_id            uuid not null references public.squads (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  -- What this member aims to save each week; drives their streak.
  weekly_target_cents integer not null default 1000 check (weekly_target_cents > 0),
  hide_amount         boolean not null default false,
  joined_at           timestamptz not null default now(),
  primary key (squad_id, user_id)
);

-- ─── Saves (self-reported, no real money moves) ──────────────────────────────
create table public.saves (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  squad_id     uuid references public.squads (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  source       text not null default 'manual' check (source in ('manual', 'spin')),
  created_at   timestamptz not null default now()
);
create index saves_squad_idx on public.saves (squad_id, created_at desc);
create index saves_user_idx on public.saves (user_id, created_at desc);

-- ─── Cheers on activity ──────────────────────────────────────────────────────
create table public.cheers (
  save_id    uuid not null references public.saves (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (save_id, user_id)
);

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Helper: is the current user in this squad? (security definer avoids
-- squad_members policies recursing into themselves.)
create function public.is_squad_member(sid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.squad_members
    where squad_id = sid and user_id = auth.uid()
  );
$$;

-- Helper: do the current user and another user share any squad?
create function public.shares_squad_with(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.squad_members a
    join public.squad_members b on a.squad_id = b.squad_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

alter table public.profiles      enable row level security;
alter table public.squads        enable row level security;
alter table public.squad_members enable row level security;
alter table public.saves         enable row level security;
alter table public.cheers        enable row level security;

create policy "see own and squadmates' profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_squad_with(id));
create policy "edit own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their squads" on public.squads
  for select to authenticated
  using (public.is_squad_member(id) or created_by = auth.uid());
create policy "anyone signed in can create a squad" on public.squads
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "creator edits squad" on public.squads
  for update to authenticated
  using (created_by = auth.uid());

create policy "members see members" on public.squad_members
  for select to authenticated
  using (public.is_squad_member(squad_id));
create policy "creator adds self as first member" on public.squad_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.squads s where s.id = squad_id and s.created_by = auth.uid())
  );
create policy "edit own membership" on public.squad_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave squad" on public.squad_members
  for delete to authenticated
  using (user_id = auth.uid());

create policy "see own and squad saves" on public.saves
  for select to authenticated
  using (user_id = auth.uid() or (squad_id is not null and public.is_squad_member(squad_id)));
create policy "add own saves" on public.saves
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (squad_id is null or public.is_squad_member(squad_id))
  );

create policy "see cheers in my squads" on public.cheers
  for select to authenticated
  using (exists (
    select 1 from public.saves s
    where s.id = save_id and (s.user_id = auth.uid() or public.is_squad_member(s.squad_id))
  ));
create policy "cheer squad saves" on public.cheers
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.saves s where s.id = save_id and public.is_squad_member(s.squad_id))
  );
create policy "un-cheer" on public.cheers
  for delete to authenticated
  using (user_id = auth.uid());

-- ─── Joining by invite link ──────────────────────────────────────────────────
-- Non-members can't read squads, so joining goes through this function.
create function public.squad_preview(code text)
returns table (id uuid, name text, target_cents integer, deadline date, member_count bigint)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, s.name, s.target_cents, s.deadline,
         (select count(*) from public.squad_members m where m.squad_id = s.id)
  from public.squads s
  where s.invite_code = code;
$$;

create function public.join_squad(code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select id into sid from public.squads where invite_code = code;
  if sid is null then
    raise exception 'Invite link is invalid';
  end if;
  insert into public.squad_members (squad_id, user_id)
  values (sid, auth.uid())
  on conflict do nothing;
  return sid;
end;
$$;

revoke execute on function public.squad_preview(text) from anon, public;
revoke execute on function public.join_squad(text) from anon, public;
grant execute on function public.squad_preview(text) to authenticated;
grant execute on function public.join_squad(text) to authenticated;

-- ─── Realtime: the shared bar moves live ─────────────────────────────────────
alter publication supabase_realtime add table public.saves;
alter publication supabase_realtime add table public.squad_members;
