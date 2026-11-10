import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { buildFeed, streakStats, timeAgo, type FeedSave } from "@/lib/streaks";
import { updateWeeklyTarget } from "./actions";
import { ChipIn } from "./chip-in";
import { InviteCard } from "./invite-card";
import { LiveRefresh } from "./live-refresh";

type Member = {
  user_id: string;
  weekly_target_cents: number;
  hide_amount: boolean;
  profiles: { display_name: string; avatar_color: string } | null;
};

export default function SquadPage({ params }: PageProps<"/squads/[id]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SquadContent params={params} />
    </Suspense>
  );
}

async function SquadContent({ params }: Pick<PageProps<"/squads/[id]">, "params">) {
  const { id } = await params;
  const { supabase, userId } = await requireUserId(`/squads/${id}`);

  const [{ data: squad }, { data: membersData }, { data: savesData }] = await Promise.all([
    supabase
      .from("squads")
      .select("id, name, target_cents, deadline, invite_code, show_amounts")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("squad_members")
      .select("user_id, weekly_target_cents, hide_amount, profiles(display_name, avatar_color)")
      .eq("squad_id", id)
      .order("joined_at")
      .returns<Member[]>(),
    supabase
      .from("saves")
      .select("id, user_id, amount_cents, created_at")
      .eq("squad_id", id)
      .returns<FeedSave[]>(),
  ]);

  if (!squad) notFound();
  const members = membersData ?? [];
  const saves = savesData ?? [];
  const now = new Date();

  const byUser = new Map<string, FeedSave[]>();
  for (const s of saves) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const sum = (list: FeedSave[] = []) => list.reduce((a, s) => a + s.amount_cents, 0);

  const rows = members.map((m) => {
    const isMe = m.user_id === userId;
    return {
      ...m,
      isMe,
      name: isMe ? "You" : m.profiles?.display_name || "Friend",
      color: m.profiles?.avatar_color ?? "#5b3ff0",
      total: sum(byUser.get(m.user_id)),
      hidden: !isMe && (m.hide_amount || !squad.show_amounts),
      streak: streakStats(byUser.get(m.user_id) ?? [], m.weekly_target_cents, now),
    };
  });
  const memberById = new Map(rows.map((r) => [r.user_id, r]));
  const me = rows.find((r) => r.isMe);

  const total = sum(saves);
  const pct = Math.min(100, Math.round((total / squad.target_cents) * 100));
  const deadline = new Date(squad.deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const feed = buildFeed(saves, new Map(members.map((m) => [m.user_id, m.weekly_target_cents])));

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <header className="flex items-center">
        <Link href="/" className="text-xl font-bold" aria-label="Back">
          ‹
        </Link>
        <h1 className="flex-1 pr-4 text-center font-bold">Squad</h1>
      </header>

      <section className="mt-5">
        <h2 className="text-2xl font-extrabold">{squad.name}</h2>
        <p className="text-sm text-muted">
          {members.length} {members.length === 1 ? "friend" : "friends"} · by {deadline}
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold">{formatMoney(total)}</span>
          <span className="text-sm text-muted">of {formatMoney(squad.target_cents)}</span>
          <span className="ml-auto rounded-full bg-lime/60 px-2 py-0.5 text-xs font-bold">
            {pct}%
          </span>
        </div>
        {/* One shared bar. With amounts visible, each friend gets a segment in their color. */}
        <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-black/10">
          {squad.show_amounts ? (
            rows.map((r) => {
              const share = (r.total / squad.target_cents) * 100;
              return share > 0 ? (
                <div
                  key={r.user_id}
                  className="h-full transition-[width] duration-700"
                  style={{ width: `${Math.min(share, 100)}%`, background: r.color }}
                />
              ) : null;
            })
          ) : (
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-muted">One shared bar. Everyone sees it move.</p>
      </section>

      {me && (
        <section className="mt-4 rounded-3xl bg-brand p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div className="flex-1">
              <p className="text-lg font-extrabold">
                {me.streak.current}-week streak
              </p>
              <p className="text-xs text-white/70">Best: {me.streak.best} weeks</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-lime"
              style={{
                width: `${Math.min(100, (me.streak.thisWeekCents / me.weekly_target_cents) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm">
            {me.streak.metThisWeek
              ? "✓ This week's save is done. Streak safe!"
              : `${formatMoney(me.weekly_target_cents - me.streak.thisWeekCents, { showCents: true })} more this week to keep your streak.`}
          </p>
          <details className="mt-2 text-xs text-white/70">
            <summary className="cursor-pointer">
              Weekly target: {formatMoney(me.weekly_target_cents, { showCents: true })} · change
            </summary>
            <form action={updateWeeklyTarget.bind(null, squad.id)} className="mt-2 flex gap-2">
              <input
                name="weekly"
                inputMode="decimal"
                defaultValue={me.weekly_target_cents / 100}
                className="w-24 rounded-full bg-white/15 px-3 py-1.5 text-white outline-none"
              />
              <button className="rounded-full bg-lime px-4 py-1.5 font-bold text-foreground">
                Save
              </button>
            </form>
          </details>
        </section>
      )}

      <div className="mt-4">
        <InviteCard code={squad.invite_code} squadName={squad.name} />
      </div>

      <section className="mt-6">
        <h3 className="font-bold">Who&apos;s in</h3>
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <Avatar name={r.isMe ? (me?.profiles?.display_name ?? "You") : r.name} color={r.color} />
              <span className="flex-1 font-semibold">{r.name}</span>
              <span
                className={`text-sm font-bold ${r.streak.current > 0 ? "text-flame" : "text-muted"}`}
              >
                🔥 {r.streak.current} wk
              </span>
              <span className="w-16 text-right font-bold">
                {r.hidden ? "•••" : formatMoney(r.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 mb-4">
        <h3 className="font-bold">Activity</h3>
        {feed.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No saves yet. Be the first to chip in!</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {feed.map((e) => {
              const who = memberById.get(e.userId);
              const name = who?.name ?? "Someone";
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
                  <Avatar
                    name={who?.isMe ? (me?.profiles?.display_name ?? "You") : name}
                    color={who?.color ?? "#999"}
                  />
                  <span className="flex-1 text-sm">
                    {e.kind === "save" ? (
                      <>
                        <strong>{name}</strong>{" "}
                        {who?.hidden ? "chipped in" : `chipped in ${formatMoney(e.amountCents, { showCents: e.amountCents % 100 !== 0 })}`}
                      </>
                    ) : (
                      <>
                        <strong>{name}</strong> hit a {e.weeks}-week streak 🔥
                      </>
                    )}
                    <span className="block text-xs text-muted">{timeAgo(e.at, now)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background pt-6 pb-6">
        <ChipIn squadId={squad.id} />
        <p className="mt-2 text-center text-xs text-muted">
          Proof of concept: saves are self-reported. No real money moves.
        </p>
      </div>
      <LiveRefresh squadId={squad.id} />
    </main>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: color }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
