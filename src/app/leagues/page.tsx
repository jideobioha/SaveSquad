import Link from "next/link";
import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BottomNav } from "@/components/bottom-nav";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { weekStart } from "@/lib/streaks";
import { CheckInButton, NewDuel, PaidButton, RespondButtons } from "./duel-buttons";

type Standing = { squad_id: string; name: string; members: number; on_time: number; is_mine: boolean };

export default function LeaguesPage({ searchParams }: PageProps<"/leagues">) {
  return (
    <>
      <main className="flex flex-1 flex-col px-5 py-6">
        <Suspense fallback={<PageSpinner />}>
          <LeaguesContent searchParams={searchParams} />
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}

async function LeaguesContent({ searchParams }: Pick<PageProps<"/leagues">, "searchParams">) {
  const { tab } = await searchParams;
  const { supabase, userId } = await requireUserId("/leagues");
  const now = new Date();

  // Time left until the week resets (Monday 00:00 UTC).
  const msLeft = weekStart(now).getTime() + 7 * 86_400_000 - now.getTime();
  const daysLeft = Math.floor(msLeft / 86_400_000);
  const hoursLeft = Math.floor((msLeft % 86_400_000) / 3_600_000);

  const showDuels = tab === "duels";

  return (
    <>
      <header className="flex items-center">
        <h1 className="text-2xl font-extrabold">Leagues</h1>
        <span className="ml-auto rounded-full bg-flame/10 px-3 py-1 text-xs font-bold text-flame">
          ⏱ {daysLeft > 0 ? `${daysLeft}d ` : ""}
          {hoursLeft}h left
        </span>
      </header>

      <nav className="mt-4 grid grid-cols-2 rounded-full bg-black/5 p-1 text-sm font-bold">
        <Link
          href="/leagues"
          className={`rounded-full py-2 text-center ${showDuels ? "text-muted" : "bg-card shadow-sm"}`}
        >
          Squad league
        </Link>
        <Link
          href="/leagues?tab=duels"
          className={`rounded-full py-2 text-center ${showDuels ? "bg-card shadow-sm" : "text-muted"}`}
        >
          Friend duels
        </Link>
      </nav>

      {showDuels ? (
        <Duels supabase={supabase} userId={userId} now={now} />
      ) : (
        <League supabase={supabase} />
      )}
    </>
  );
}

async function League({ supabase }: { supabase: SupabaseClient }) {
  const { data } = await supabase.rpc("league_standings");
  const standings = ((data ?? []) as Standing[])
    .map((s) => ({ ...s, pct: s.members > 0 ? Math.round((s.on_time / s.members) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.on_time - a.on_time || a.name.localeCompare(b.name));

  if (standings.length === 0) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-4xl">🏆</p>
        <h2 className="mt-3 text-xl font-bold">No squads in the league yet</h2>
        <p className="mt-2 text-sm text-muted">
          Turn on &ldquo;Join the Squad League&rdquo; in a squad&apos;s settings to compete.
        </p>
      </div>
    );
  }

  const mineIdx = standings.findIndex((s) => s.is_mine);
  const mine = mineIdx >= 0 ? standings[mineIdx] : null;
  let hint: string | null = null;
  if (mine && mineIdx === 0) {
    hint = "Your squad is #1 this week. Keep the streaks going!";
  } else if (mine) {
    const above = standings[mineIdx - 1];
    // Smallest number of extra on-time members that beats the squad above.
    let k = 1;
    while (k <= mine.members - mine.on_time && ((mine.on_time + k) / mine.members) * 100 <= above.pct) k++;
    if (k <= mine.members - mine.on_time) {
      hint = `${k} more on-time ${k === 1 ? "save" : "saves"} from your squad moves you to #${mineIdx}.`;
    }
  }

  const podium = [standings[1], standings[0], standings[2]];
  const heights = ["h-20", "h-28", "h-16"];
  const ranks = [2, 1, 3];

  return (
    <>
      <p className="mt-4 rounded-2xl bg-brand/10 px-4 py-3 text-sm">
        ⚡ <strong>Ranked by consistency, not cash.</strong> Every on-time save scores the same.
      </p>

      <div className="mt-6 flex items-end gap-2">
        {podium.map((s, i) =>
          s ? (
            <div key={s.squad_id} className="flex flex-1 flex-col items-center">
              <span
                className={`flex size-9 items-center justify-center rounded-full text-sm font-extrabold text-white ${
                  ranks[i] === 1 ? "bg-brand" : ranks[i] === 2 ? "bg-sky-500" : "bg-emerald-500"
                }`}
              >
                {ranks[i]}
              </span>
              <span className="mt-1 line-clamp-1 text-center text-xs font-bold">{s.name}</span>
              <div
                className={`mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl pt-3 ${heights[i]} ${
                  s.is_mine ? "bg-brand text-white" : "bg-card"
                }`}
              >
                <span className="text-lg font-extrabold">{s.pct}%</span>
                <span className={`text-[10px] ${s.is_mine ? "text-white/70" : "text-muted"}`}>on time</span>
              </div>
            </div>
          ) : (
            <div key={i} className="flex-1" />
          ),
        )}
      </div>

      {standings.length > 3 && (
        <ol className="mt-3 space-y-2">
          {standings.slice(3).map((s, i) => (
            <li
              key={s.squad_id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                s.is_mine ? "border-2 border-brand bg-brand/5" : "bg-card"
              }`}
            >
              <span className="w-5 text-sm font-bold text-muted">{i + 4}</span>
              <span className="flex-1 font-semibold">
                {s.is_mine ? `Your squad: ${s.name}` : s.name}
              </span>
              <span className="font-bold">{s.pct}%</span>
            </li>
          ))}
        </ol>
      )}

      {hint && <p className="mt-4 text-center text-sm font-semibold text-brand">{hint}</p>}
      <p className="mt-2 text-center text-xs text-muted">
        On time = hit your weekly target (or used a freeze). Resets every Monday.
      </p>
    </>
  );
}

type Person = { display_name: string; avatar_color: string } | null;
type Duel = {
  id: string;
  challenger: string;
  opponent: string;
  challenge: string;
  stake_cents: number;
  week_start: string;
  status: "pending" | "active" | "declined";
  loser_paid: boolean;
  c: Person;
  o: Person;
};

async function Duels({ supabase, userId, now }: { supabase: SupabaseClient; userId: string; now: Date }) {
  const thisWeek = weekStart(now).toISOString().slice(0, 10);
  const lastWeek = new Date(weekStart(now).getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [{ data: duelsData }, { data: myMemberships }] = await Promise.all([
    supabase
      .from("duels")
      .select(
        "id, challenger, opponent, challenge, stake_cents, week_start, status, loser_paid, c:profiles!duels_challenger_fkey(display_name, avatar_color), o:profiles!duels_opponent_fkey(display_name, avatar_color)",
      )
      .or(`challenger.eq.${userId},opponent.eq.${userId}`)
      .gte("week_start", lastWeek)
      .neq("status", "declined")
      .order("created_at", { ascending: false })
      .returns<Duel[]>(),
    supabase.from("squad_members").select("squad_id").eq("user_id", userId),
  ]);
  const duels = duelsData ?? [];

  // Friends = everyone in your squads.
  const squadIds = (myMemberships ?? []).map((m) => m.squad_id);
  const { data: mates } = squadIds.length
    ? await supabase
        .from("squad_members")
        .select("user_id, profiles(display_name, avatar_color)")
        .in("squad_id", squadIds)
        .neq("user_id", userId)
        .returns<{ user_id: string; profiles: Person }[]>()
    : { data: [] };
  const friends = [...new Map((mates ?? []).map((m) => [m.user_id, m])).values()].map((m) => ({
    id: m.user_id,
    name: m.profiles?.display_name ?? "Friend",
    color: m.profiles?.avatar_color ?? "#999",
  }));

  const { data: checkins } = duels.length
    ? await supabase
        .from("duel_checkins")
        .select("duel_id, user_id, day")
        .in("duel_id", duels.map((d) => d.id))
    : { data: [] as { duel_id: string; user_id: string; day: string }[] };

  const days = (duelId: string, uid: string) =>
    (checkins ?? []).filter((c) => c.duel_id === duelId && c.user_id === uid).length;

  const current = duels.filter((d) => d.week_start === thisWeek);
  const finished = duels.filter((d) => d.week_start === lastWeek && d.status === "active");

  return (
    <div className="mt-5 space-y-4">
      <NewDuel friends={friends} />

      {current.length === 0 && finished.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          No duels this week. Challenge a friend to a week-long habit!
        </p>
      )}

      {current.map((d) => {
        const meIsChallenger = d.challenger === userId;
        const them = meIsChallenger ? d.o : d.c;
        const themId = meIsChallenger ? d.opponent : d.challenger;
        const myDays = days(d.id, userId);
        const theirDays = days(d.id, themId);
        const checkedToday = (checkins ?? []).some(
          (c) => c.duel_id === d.id && c.user_id === userId && c.day === today,
        );
        return (
          <section key={d.id} className="rounded-3xl bg-foreground p-5 text-white">
            <p className="text-xs font-extrabold text-lime">FRIEND DUEL · {d.challenge.toUpperCase()}</p>
            <div className="mt-4 flex items-center justify-around">
              <Duelist name="You" color="#5b3ff0" score={d.status === "active" ? `${myDays}/7` : ""} />
              <span className="text-xl font-extrabold text-white/60">VS</span>
              <Duelist
                name={them?.display_name ?? "Friend"}
                color={them?.avatar_color ?? "#999"}
                score={d.status === "active" ? `${theirDays}/7` : ""}
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/60">
              {d.stake_cents > 0
                ? `Loser funds the winner's goal ${formatMoney(d.stake_cents)}`
                : "Just for bragging rights"}
            </p>
            {d.status === "pending" &&
              (meIsChallenger ? (
                <p className="mt-3 text-center text-sm font-semibold text-white/80">
                  Waiting for {them?.display_name ?? "your friend"} to accept…
                </p>
              ) : (
                <RespondButtons duelId={d.id} />
              ))}
            {d.status === "active" && <CheckInButton duelId={d.id} checkedToday={checkedToday} />}
          </section>
        );
      })}

      {finished.length > 0 && <h2 className="pt-2 font-bold">Last week</h2>}
      {finished.map((d) => {
        const meIsChallenger = d.challenger === userId;
        const them = meIsChallenger ? d.o : d.c;
        const themId = meIsChallenger ? d.opponent : d.challenger;
        const mine = days(d.id, userId);
        const theirs = days(d.id, themId);
        const name = them?.display_name ?? "your friend";
        const result =
          mine === theirs
            ? "It's a tie! No one pays."
            : mine > theirs
              ? `You won ${mine}–${theirs}! ${d.stake_cents > 0 ? `${name} funds your goal ${formatMoney(d.stake_cents)}.` : ""}`
              : `${name} won ${theirs}–${mine}. ${d.stake_cents > 0 ? `Fund ${name}'s goal ${formatMoney(d.stake_cents)}.` : ""}`;
        return (
          <section key={d.id} className="rounded-3xl bg-card p-5 shadow-sm">
            <p className="text-xs font-extrabold text-muted">{d.challenge.toUpperCase()}</p>
            <p className="mt-1 font-bold">{result}</p>
            {d.stake_cents > 0 && mine !== theirs && (
              d.loser_paid ? (
                <p className="mt-2 text-sm font-semibold text-brand">✓ Stake paid</p>
              ) : (
                <PaidButton duelId={d.id} />
              )
            )}
          </section>
        );
      })}
    </div>
  );
}

function Duelist({ name, color, score }: { name: string; color: string; score: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="flex size-12 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/20"
        style={{ background: color }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className="mt-1 text-sm font-semibold">{name}</span>
      {score && <span className="text-lg font-extrabold text-lime">{score}</span>}
    </div>
  );
}
