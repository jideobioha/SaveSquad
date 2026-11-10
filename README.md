# SaveSquad

**Save solo. Win together.**

SaveSquad is a savings app for students and early-career earners (18–30) that combines **gamified savings** with **community capital**. Your personal streaks and daily challenges power a shared goal you're saving toward with friends, like a group trip. Squads compete on **consistency, not cash**, so everyone can win no matter how much they earn.

> This repo is a **proof of concept**. Saves are **self-reported**: you tap "I saved $12" and the app records it. No bank is connected and no real money moves.

The original pitch is in [`PS317-MakerDay2.pptx.pdf`](./PS317-MakerDay2.pptx.pdf) (Team 317, Maker Day 2).

---

## The problem

From 20 interviews (undergrads, grad/MBA students, part-time and full-time workers, Sept 2026):

- **7 of 20** save whatever is left over, or have no set goal.
- **7 of 20** asked for visual progress or radical simplicity.
- **9 of 20** named income or cost of living as their #1 blocker.
- Every option they use today is **solo**. Friend groups planning a trip have no tool for saving together.

Two tensions shape the design:
- **Knowing vs. doing:** everyone knows they should save.
- **Help vs. control:** "make it automatic, but let me decide." Nothing moves without a tap.

## How it works: one loop

1. **Pick a goal.** It becomes your level.
2. **Play a challenge.** Spin to see what you save today.
3. **Get the win.** Streak, XP and badges.
4. **Rally the squad.** Your win moves the shared bar.

## Roadmap

We build from must-haves to nice-to-haves until everything in the deck exists.

### Phase 0: Setup
- [x] Next.js + Tailwind scaffold, brand theme
- [x] Supabase client wiring
- [x] Database schema for Phase 1 (`supabase/migrations/0001_squads.sql`)
- [x] Supabase project created and connected

### Phase 1: Must-haves (the wedge: friend groups planning a trip)
- [x] Sign in with an email magic link
- [x] Create a squad goal (name, target, deadline) and invite friends by link
- [x] Join a squad from an invite link
- [ ] Squad screen: one shared progress bar, "Who's in", activity feed
- [x] Chip in any amount, with the bar updating live for everyone
- [ ] Weekly streaks per member
- [ ] First deploy to Vercel

### Phase 2: The core loop
- [ ] Pick-a-goal onboarding (Trip / Emergency fund / Down payment / Something else)
- [ ] Home dashboard (goal card, streak row, today's challenge, squad preview)
- [ ] **Spin the Save** daily challenge
- [ ] "Streak saved!" celebration and share to squad
- [ ] XP and levels
- [ ] Cheer and Nudge; hide my amount

### Phase 3: Rewards and trust
- [ ] Badges (Quarter Streaker, First $100, Squad Starter, …)
- [ ] Profile: total saved, best streak, level path, monthly chart, badges
- [ ] Streak freezes for tight weeks
- [ ] Withdrawals need a squad vote; squad-rules toggles
- [ ] Contribution modes: chip in anytime / equal split / weekly

### Phase 4: Competition
- [ ] Weekly squad leagues ranked by on-time %
- [ ] 1-on-1 friend duels
- [ ] Multiple solo goals alongside squads

## Key rules

- **Streak:** a week is "on time" when your saves that week reach your weekly target. Consecutive on-time weeks make your streak, and a streak freeze covers one missed week.
- **League score:** a squad's on-time %, not dollars saved.
- **Privacy:** any member can hide their amount; the squad still sees the shared bar.

## Tech stack

| Part | Choice |
|---|---|
| App | [Next.js 16](https://nextjs.org) (App Router, TypeScript) |
| Styling | Tailwind CSS v4, mobile-first |
| Data and auth | [Supabase](https://supabase.com) free tier (Postgres, magic-link auth, row-level security, Realtime) |
| Hosting | [Vercel](https://vercel.com) Hobby (free) |

## Run it locally

You need **Node.js 20+** (`node -v` to check).

```bash
npm install
cp .env.example .env.local   # then paste in your Supabase values
npm run dev
```

Open <http://localhost:3000>. The app is designed for phone width, so use your browser's device toolbar or open it on your phone.

### Set up Supabase (one time)

1. Create a free account at [supabase.com](https://supabase.com) ("Continue with GitHub" works).
2. **New project.** Name it `savesquad`, set a database password (save it), and pick the nearest region.
3. Click **Connect** at the top of the dashboard, or go to **Project Settings → API Keys**. Copy the **Project URL** and the **publishable key** into `.env.local`.
4. Open **SQL Editor → New query**, paste the contents of each file in `supabase/migrations/` **in order**, and click **Run**.
5. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000`. After deploying, add your Vercel URL too.

### Test accounts (skip the email limit)

Supabase's free email sender only allows a few sign-in emails per hour. For testing with several people:

1. Go to Supabase → **Authentication → Users → Add user → Create new user**.
2. Use any email (e.g. `maya@test.dev`) and a password, and tick **Auto Confirm User**.
3. On the login page, tap **Sign in with a password (test accounts)**.

The display name defaults to the part of the email before `@`.

### Environment variables

| Name | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Connect → publishable key (older projects call it the "anon" key) |

`.env.local` is git-ignored. Never commit keys.

## Data model

| Table | What it holds |
|---|---|
| `profiles` | display name, avatar color, XP, level |
| `squads` | shared goal: name, target, deadline, rules, invite code |
| `squad_members` | who's in, each member's weekly target, hide-amount flag |
| `saves` | self-reported saves (amount, source, time) |
| `cheers` | reactions on squad activity |

Later phases add `goals`, `spins`, `streak_freezes`, `badges`, `withdrawals`/`withdrawal_votes` and `duels`.

Row-level security means you can only read squads you belong to. Joining goes through an invite code.

## Project structure

```
src/
  app/              # pages (App Router)
  lib/supabase/     # Supabase clients: browser, server, proxy session refresh
  proxy.ts          # refreshes the auth session on each request
supabase/
  migrations/       # SQL to paste into the Supabase SQL Editor, in order
```

## Deployment

Coming at the end of Phase 1: step-by-step Vercel (free tier) instructions.

## Team

**Team 317:** Tenzin Sherap, Keer Hu, Jidechukwu Obioha
