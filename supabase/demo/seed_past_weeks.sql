-- SaveSquad · DEMO DATA (not a migration; run only when you want it)
--
-- Fills in past weeks of saves for one of your squads so you can demo
-- multi-week streaks, the activity feed, the league and badges without
-- waiting weeks. Everyone in the squad gets on-time saves for the last
-- N weeks; friends randomly miss ~1 in 5 weeks so streaks look realistic.
-- You (the email below) never miss, so your streak is exactly N weeks
-- (plus this week once you save).
--
-- How to run:
--   1. Change v_email to the email you log in with.
--   2. Supabase → SQL Editor → New query → paste → Run.
--   3. Open the app. Visit the Me tab to pick up any new badges.
--
-- Run it once. Running it again adds another batch of saves on top.

do $$
declare
  v_email text := 'CHANGE_ME@example.com'; -- ← your login email
  v_weeks integer := 6;                    -- how many past weeks to fill

  me uuid;
  sid uuid;
  sname text;
  m record;
  w integer;
  this_monday timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
begin
  select id into me from auth.users where lower(email) = lower(v_email);
  if me is null then
    raise exception 'No user with email %. Check v_email at the top.', v_email;
  end if;

  select m2.squad_id, s.name into sid, sname
  from public.squad_members m2 join public.squads s on s.id = m2.squad_id
  where m2.user_id = me
  order by m2.joined_at
  limit 1;
  if sid is null then
    raise exception 'That user isn''t in a squad yet. Create or join one first.';
  end if;

  for m in
    select sm.user_id, p.weekly_target_cents as target
    from public.squad_members sm join public.profiles p on p.id = sm.user_id
    where sm.squad_id = sid
  loop
    for w in 1..v_weeks loop
      continue when m.user_id <> me and random() < 0.2;

      -- Weekly target plus $0–$10 extra, some time Tue–Thu of that week.
      insert into public.saves (user_id, squad_id, amount_cents, source, created_at)
      values (
        m.user_id,
        sid,
        m.target + (floor(random() * 3) * 500)::int,
        'manual',
        this_monday - make_interval(weeks => w) + interval '1 day'
          + make_interval(hours => floor(random() * 60)::int)
      );

      -- Same XP the app would have given: +10 for the save, +100 for the week.
      update public.profiles
      set xp = xp + 110, level = (xp + 110) / 250 + 1
      where id = m.user_id;
    end loop;
  end loop;

  raise notice 'Added up to % weeks of demo saves to "%"', v_weeks, sname;
end $$;
