import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { FreezeButton } from "@/components/freeze-button";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { getProfile, getStreaks } from "@/lib/data";
import { levelProgress, levelTitle } from "@/lib/levels";
import { formatMoney } from "@/lib/money";
import { recentWeeks } from "@/lib/streaks";
import { signOut } from "../actions";
import { updateWeeklyTarget } from "./actions";

export default function MePage() {
  return (
    <>
      <Suspense fallback={<PageSpinner />}>
        <MeContent />
      </Suspense>
      <BottomNav />
    </>
  );
}

async function MeContent() {
  const { supabase, userId } = await requireUserId("/me");

  // Pick up badges earned outside a save (starting a squad, cheering).
  await supabase.rpc("refresh_my_badges");

  const [profile, streaks, { data: saves }, { data: earned }, { count: squadCount }, { data: frozen }] =
    await Promise.all([
      getProfile(supabase, userId),
      getStreaks(supabase, [userId]),
      supabase.from("saves").select("amount_cents, created_at").eq("user_id", userId),
      supabase.from("user_badges").select("badge_id").eq("user_id", userId),
      supabase.from("squad_members").select("squad_id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("streak_freezes").select("week_start").eq("user_id", userId),
    ]);
  if (!profile) return null;

  const now = new Date();
  const all = saves ?? [];
  const total = all.reduce((a, s) => a + s.amount_cents, 0);
  const streak = streaks.get(userId);
  const lvl = levelProgress(profile.xp);
  const earnedIds = new Set((earned ?? []).map((b) => b.badge_id));
  const weeks = recentWeeks(all, profile.weekly_target_cents, now, 8, (frozen ?? []).map((f) => f.week_start));
  const thisWeekDone = weeks[weeks.length - 1].met || weeks[weeks.length - 1].frozen;

  // This month vs last month (UTC).
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthTotal = (yy: number, mm: number) =>
    all
      .filter((s) => {
        const d = new Date(s.created_at);
        return d.getUTCFullYear() === yy && d.getUTCMonth() === mm;
      })
      .reduce((a, s) => a + s.amount_cents, 0);
  const thisMonth = monthTotal(y, m);
  const lastMonth = m === 0 ? monthTotal(y - 1, 11) : monthTotal(y, m - 1);
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  // Chart scale: tallest week or the weekly target, whichever is bigger.
  const maxCents = Math.max(profile.weekly_target_cents, ...weeks.map((w) => w.cents), 1);
  const targetPct = (profile.weekly_target_cents / maxCents) * 100;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="flex flex-col items-center text-center">
        <span
          className="flex size-20 items-center justify-center rounded-full text-3xl font-bold text-white"
          style={{ background: profile.avatar_color }}
        >
          {profile.display_name.slice(0, 2).toUpperCase()}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold">{profile.display_name}</h1>
        <span className="mt-1 rounded-full bg-lime px-3 py-1 text-xs font-extrabold">
          LEVEL {lvl.level} · {levelTitle(lvl.level).toUpperCase()}
        </span>
      </header>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Tile value={formatMoney(total)} label="Total saved" />
        <Tile value={`${streak?.best_weeks ?? 0} wk`} label="Best streak" />
        <Tile value={String(squadCount ?? 0)} label="Squads" />
      </section>

      {/* Level path */}
      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline">
          <h2 className="font-bold">Level path</h2>
          <span className="ml-auto text-xs font-semibold text-muted">
            {lvl.toNext} XP to Level {lvl.level + 1}
          </span>
        </div>
        <ol className="mt-4 flex items-center">
          {Array.from({ length: 5 }, (_, i) => {
            const start = Math.max(1, lvl.level - 2);
            const n = start + i;
            const done = n < lvl.level;
            const current = n === lvl.level;
            return (
              <li key={n} className="flex flex-1 items-center last:flex-none">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-brand text-white"
                      : current
                        ? "bg-lime text-foreground ring-4 ring-lime/40"
                        : "bg-black/5 text-muted"
                  }`}
                >
                  {done ? "✓" : `L${n}`}
                </span>
                {i < 4 && (
                  <span className={`mx-1 h-1 flex-1 rounded-full ${done ? "bg-brand" : "bg-black/10"}`} />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">{profile.xp} XP total</p>
      </section>

      {/* Saved this month + weekly bars */}
      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline">
          <div>
            <h2 className="text-sm font-semibold text-muted">Saved this month</h2>
            <p className="text-3xl font-extrabold">{formatMoney(thisMonth)}</p>
          </div>
          {change !== null && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${
                change >= 0 ? "bg-lime/60 text-foreground" : "bg-black/5 text-muted"
              }`}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% vs last month
            </span>
          )}
        </div>

        <figure className="mt-5">
          <figcaption className="mb-2 text-xs font-semibold text-muted">Last 8 weeks</figcaption>
          <div className="relative h-32">
            {/* Weekly target reference line */}
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30"
              style={{ bottom: `${targetPct}%` }}
            >
              <span className="absolute -top-4 right-0 text-[10px] text-muted">
                target {formatMoney(profile.weekly_target_cents)}
              </span>
            </div>
            <div className="flex h-full items-end gap-[2px]">
              {weeks.map((w, i) => (
                <div key={w.week} className="group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-7 rounded-t-[4px] ${w.cents > 0 ? "bg-brand" : ""} ${
                      w.isCurrent ? "" : "opacity-80"
                    } group-hover:opacity-100`}
                    style={{ height: `${(w.cents / maxCents) * 100}%`, minHeight: w.cents > 0 ? 4 : 0 }}
                  />
                  {w.frozen && <span className="absolute bottom-1 text-sm">❄️</span>}
                  <span className="pointer-events-none absolute -top-7 z-10 hidden rounded-lg bg-foreground px-2 py-1 text-[11px] font-bold whitespace-nowrap text-white group-hover:block">
                    {w.isCurrent ? "This week" : `${weeks.length - 1 - i}w ago`}: {formatMoney(w.cents, { showCents: w.cents % 100 !== 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px] border-t border-black/10 pt-1">
            {weeks.map((w, i) => (
              <span
                key={w.week}
                className={`flex-1 text-center text-[10px] ${w.isCurrent ? "font-bold text-foreground" : "text-muted"}`}
              >
                {w.isCurrent ? "Now" : `W${i + 1}`}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>Saved per week, last 8 weeks</caption>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={w.week}>
                  <th scope="row">{w.isCurrent ? "This week" : `${weeks.length - 1 - i} weeks ago`}</th>
                  <td>{formatMoney(w.cents, { showCents: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>

      {/* Streak freezes + weekly target */}
      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-center">
          <h2 className="font-bold">❄️ Streak freezes</h2>
          <span className="ml-auto text-sm font-bold">{profile.freezes} / 3</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Tight week? A freeze keeps your streak alive without saving. Earn one every 4 weeks in a row.
        </p>
        {!thisWeekDone && profile.freezes > 0 && (
          <div className="mt-3">
            <FreezeButton freezes={profile.freezes} />
          </div>
        )}
        <form action={updateWeeklyTarget} className="mt-4 flex items-center gap-2 border-t border-black/5 pt-4">
          <span className="flex-1 text-sm font-semibold">Weekly target</span>
          <span className="text-muted">$</span>
          <input
            name="weekly"
            inputMode="decimal"
            defaultValue={profile.weekly_target_cents / 100}
            className="w-20 rounded-full bg-black/5 px-3 py-1.5 outline-none"
          />
          <button className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-white">Save</button>
        </form>
      </section>

      {/* Badges */}
      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline">
          <h2 className="font-bold">Badges</h2>
          <span className="ml-auto text-xs font-semibold text-muted">
            {earnedIds.size} of {BADGES.length}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const has = earnedIds.has(b.id);
            return (
              <li key={b.id} className="flex flex-col items-center text-center" title={b.how}>
                <span
                  className={`flex size-14 items-center justify-center rounded-full text-2xl ${
                    has ? "bg-lime/50" : "bg-black/5 opacity-40 grayscale"
                  }`}
                >
                  {b.emoji}
                </span>
                <span className={`mt-1 text-[11px] leading-tight font-semibold ${has ? "" : "text-muted"}`}>
                  {b.name}
                </span>
                {!has && <span className="text-[10px] leading-tight text-muted">{b.how}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <form action={signOut} className="text-center">
        <button className="py-2 text-sm font-semibold text-muted hover:text-foreground">Sign out</button>
      </form>
    </main>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card px-2 py-3 shadow-sm">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
