import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SaveSheet } from "@/components/save-sheet";
import { PageSpinner } from "@/components/spinner";
import { GOAL_EMOJI, getActiveGoal, getProfile, getStreaks } from "@/lib/data";
import { levelProgress, levelTitle } from "@/lib/levels";
import { formatMoney } from "@/lib/money";
import { daysLeftInWeek, recentWeeks } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Landing } from "./landing";

export default function Home() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return <Landing />;

  const [profile, goal] = await Promise.all([
    getProfile(supabase, userId),
    getActiveGoal(supabase, userId),
  ]);
  if (!profile?.onboarded || !goal) redirect("/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const [streaks, { data: mySaves }, { data: memberships }, { data: spin }] = await Promise.all([
    getStreaks(supabase, [userId]),
    supabase.from("saves").select("amount_cents, created_at, goal_id").eq("user_id", userId),
    supabase
      .from("squad_members")
      .select("squads(id, name, target_cents)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .returns<{ squads: { id: string; name: string; target_cents: number } | null }[]>(),
    supabase.from("spins").select("status").eq("user_id", userId).eq("day", today).maybeSingle(),
  ]);

  const now = new Date();
  const streak = streaks.get(userId);
  const current = streak?.current_weeks ?? 0;
  const thisWeek = streak?.this_week_cents ?? 0;
  const remaining = Math.max(0, profile.weekly_target_cents - thisWeek);
  const weeks = recentWeeks(mySaves ?? [], profile.weekly_target_cents, now);
  const daysLeft = daysLeftInWeek(now);

  const goalSaved = (mySaves ?? [])
    .filter((s) => s.goal_id === goal.id)
    .reduce((a, s) => a + s.amount_cents, 0);
  const goalPct = Math.min(100, Math.round((goalSaved / goal.target_cents) * 100));
  const lvl = levelProgress(profile.xp);

  const squads = (memberships ?? []).flatMap((m) => (m.squads ? [m.squads] : []));
  const squadTotals = new Map<string, number>();
  if (squads.length > 0) {
    const { data: squadSaves } = await supabase
      .from("saves")
      .select("squad_id, amount_cents")
      .in("squad_id", squads.map((s) => s.id));
    for (const s of squadSaves ?? []) {
      if (s.squad_id) squadTotals.set(s.squad_id, (squadTotals.get(s.squad_id) ?? 0) + s.amount_cents);
    }
  }

  const spinLeft = spin?.status !== "saved";

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 py-6">
        <header className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: profile.avatar_color }}
          >
            {profile.display_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-muted">Good to see you</p>
            <p className="text-lg font-bold">{profile.display_name}</p>
          </div>
          <span className="ml-auto rounded-full bg-flame/10 px-3 py-1 text-sm font-bold text-flame">
            🔥 {current}
          </span>
          <form action={signOut}>
            <button className="text-xs font-semibold text-muted hover:text-foreground">Sign out</button>
          </form>
        </header>

        {/* Goal card: your goal is your level. */}
        <section className="rounded-3xl bg-brand p-5 text-white">
          <span className="rounded-full bg-lime px-3 py-1 text-xs font-extrabold text-foreground">
            LEVEL {lvl.level} · {levelTitle(lvl.level).toUpperCase()}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold">
            {GOAL_EMOJI[goal.kind]} {goal.name}
          </h2>
          <p className="mt-1 text-lg font-bold">
            {formatMoney(goalSaved)} <span className="text-white/60">/ {formatMoney(goal.target_cents)}</span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="mt-2 flex text-xs text-white/80">
            <span>{goalPct}% there</span>
            <span className="ml-auto">
              {lvl.toNext} XP to Level {lvl.level + 1}
            </span>
          </div>
        </section>

        {/* Streak card */}
        <section className="rounded-3xl bg-card p-5 shadow-sm">
          <div className="flex items-baseline">
            <h3 className="text-lg font-extrabold">🔥 {current}-week streak</h3>
            <span className="ml-auto text-xs font-semibold text-muted">Best {streak?.best_weeks ?? 0}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {remaining === 0
              ? `✓ This week is done. You're on ${current} ${current === 1 ? "week" : "weeks"}.`
              : `Save ${formatMoney(remaining, { showCents: remaining % 100 !== 0 })} ${
                  daysLeft === 0 ? "today" : "by Sunday"
                } to hit ${current + 1} ${current + 1 === 1 ? "week" : "weeks"}.`}
          </p>
          <ol className="mt-4 flex justify-between">
            {weeks.map((w, i) => (
              <li key={w.week} className="flex flex-col items-center gap-1">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    w.met
                      ? "bg-flame text-white"
                      : w.isCurrent
                        ? "border-2 border-dashed border-flame text-flame"
                        : "bg-black/5 text-muted"
                  }`}
                >
                  {w.met ? "✓" : ""}
                </span>
                <span className={`text-[10px] ${w.isCurrent ? "font-bold text-foreground" : "text-muted"}`}>
                  {w.isCurrent ? "Now" : `W${i + 1}`}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <SaveSheet
              destination={{ goalId: goal.id }}
              buttonLabel={
                remaining > 0
                  ? `Save ${formatMoney(remaining, { showCents: remaining % 100 !== 0 })} now`
                  : "Save a little extra"
              }
              title={`Save to ${goal.name}`}
              submitLabel={`Add to ${goal.name}`}
              defaultAmount={remaining > 0 ? Math.ceil(remaining / 100) : undefined}
              buttonClassName="w-full rounded-full bg-foreground py-3 font-bold text-white"
            />
          </div>
        </section>

        {/* Today's challenge */}
        <Link
          href="/challenges"
          className="flex items-center gap-4 rounded-3xl bg-lime/40 p-5"
        >
          <span className="text-3xl">🎡</span>
          <span className="flex-1">
            <span className="block text-xs font-extrabold text-foreground/60">TODAY&apos;S CHALLENGE</span>
            <span className="block font-bold">Spin the Save</span>
            <span className="block text-xs text-foreground/70">
              +20 XP · {spinLeft ? "1 spin left" : "Done for today"}
            </span>
          </span>
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-white">
            {spinLeft ? "Play" : "View"}
          </span>
        </Link>

        {/* Squads preview */}
        <section>
          <div className="flex items-center">
            <h3 className="font-bold">Your squads</h3>
            <Link href="/squads/new" className="ml-auto text-sm font-bold text-brand">
              + New squad goal
            </Link>
          </div>
          {squads.length === 0 ? (
            <Link
              href="/squads/new"
              className="mt-2 block rounded-3xl border-2 border-dashed border-black/10 p-5 text-center text-sm text-muted"
            >
              Save with friends for a trip. <strong className="text-brand">Start a squad</strong>
            </Link>
          ) : (
            <ul className="mt-2 space-y-2">
              {squads.map((sq) => {
                const saved = squadTotals.get(sq.id) ?? 0;
                const pct = Math.min(100, Math.round((saved / sq.target_cents) * 100));
                return (
                  <li key={sq.id}>
                    <Link href={`/squads/${sq.id}`} className="block rounded-3xl bg-card p-4 shadow-sm">
                      <div className="flex items-baseline">
                        <span className="font-bold">{sq.name}</span>
                        <span className="ml-auto text-xs font-bold text-muted">{pct}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {formatMoney(saved)} of {formatMoney(sq.target_cents)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}
