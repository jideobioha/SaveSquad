import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SaveSheet } from "@/components/save-sheet";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { getStreaks } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { timeAgo, weekStart } from "@/lib/streaks";
import { CheerButton, HideAmountToggle, NudgeButton } from "./buttons";
import { InviteCard } from "./invite-card";
import { LiveRefresh } from "./live-refresh";
import { VoteButtons, WithdrawButton } from "./withdrawals";

type Member = {
  user_id: string;
  hide_amount: boolean;
  profiles: { display_name: string; avatar_color: string } | null;
};
type Save = { id: string; user_id: string; amount_cents: number; created_at: string };
type Post = {
  id: string;
  user_id: string;
  kind: "streak" | "nudge";
  streak_weeks: number | null;
  target_user_id: string | null;
  created_at: string;
};
type Withdrawal = {
  id: string;
  requested_by: string;
  amount_cents: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
  withdrawal_votes: { user_id: string; approve: boolean }[];
};
type FeedItem =
  | ({ type: "save" } & Save)
  | ({ type: "post" } & Post)
  | ({ type: "withdrawal"; user_id: string } & Withdrawal);

const MODE_LABEL = {
  anytime: "Chip in anytime",
  equal_split: "Equal split",
  weekly_auto: "Weekly",
} as const;

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

  const [
    { data: squad },
    { data: membersData },
    { data: savesData },
    { data: postsData },
    { data: withdrawalsData },
  ] = await Promise.all([
      supabase
        .from("squads")
        .select(
          "id, name, target_cents, deadline, invite_code, show_amounts, contribution_mode, withdrawals_need_vote, join_league, created_by",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("squad_members")
        .select("user_id, hide_amount, profiles(display_name, avatar_color)")
        .eq("squad_id", id)
        .order("joined_at")
        .returns<Member[]>(),
      supabase
        .from("saves")
        .select("id, user_id, amount_cents, created_at")
        .eq("squad_id", id)
        .returns<Save[]>(),
      supabase
        .from("squad_posts")
        .select("id, user_id, kind, streak_weeks, target_user_id, created_at")
        .eq("squad_id", id)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<Post[]>(),
      supabase
        .from("withdrawals")
        .select(
          "id, requested_by, amount_cents, reason, status, created_at, resolved_at, withdrawal_votes(user_id, approve)",
        )
        .eq("squad_id", id)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<Withdrawal[]>(),
    ]);

  if (!squad) notFound();
  const members = membersData ?? [];
  const saves = savesData ?? [];
  const now = new Date();
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const [streaks, { data: cheersData }, { data: myNudges }] = await Promise.all([
    getStreaks(supabase, members.map((m) => m.user_id)),
    saves.length > 0
      ? supabase.from("cheers").select("save_id, user_id").in("save_id", saves.map((s) => s.id))
      : Promise.resolve({ data: [] as { save_id: string; user_id: string }[] }),
    supabase
      .from("squad_posts")
      .select("target_user_id")
      .eq("squad_id", id)
      .eq("user_id", userId)
      .eq("kind", "nudge")
      .gte("created_at", since),
  ]);

  const cheers = new Map<string, { count: number; mine: boolean }>();
  for (const c of cheersData ?? []) {
    const cur = cheers.get(c.save_id) ?? { count: 0, mine: false };
    cheers.set(c.save_id, { count: cur.count + 1, mine: cur.mine || c.user_id === userId });
  }
  const nudgedToday = new Set((myNudges ?? []).map((n) => n.target_user_id));

  const totals = new Map<string, number>();
  for (const s of saves) totals.set(s.user_id, (totals.get(s.user_id) ?? 0) + s.amount_cents);

  const rows = members.map((m) => {
    const isMe = m.user_id === userId;
    const displayName = m.profiles?.display_name || "Friend";
    return {
      ...m,
      isMe,
      displayName,
      label: isMe ? "You" : displayName,
      color: m.profiles?.avatar_color ?? "#5b3ff0",
      total: totals.get(m.user_id) ?? 0,
      hidden: !isMe && (m.hide_amount || !squad.show_amounts),
      streak: streaks.get(m.user_id)?.current_weeks ?? 0,
    };
  });
  const byId = new Map(rows.map((r) => [r.user_id, r]));
  const me = rows.find((r) => r.isMe);
  // Hidden amounts are pooled into one grey segment so the bar never gives them away.
  const hiddenTotal = rows.filter((r) => r.hidden).reduce((a, r) => a + r.total, 0);

  const withdrawals = withdrawalsData ?? [];
  const pending = withdrawals.filter((w) => w.status === "pending");
  const gross = saves.reduce((a, s) => a + s.amount_cents, 0);
  const withdrawn = withdrawals
    .filter((w) => w.status === "approved")
    .reduce((a, w) => a + w.amount_cents, 0);
  const total = gross - withdrawn;
  const pct = Math.min(100, Math.round((total / squad.target_cents) * 100));
  // After withdrawals, shrink everyone's segment proportionally so the bar shows what's left.
  const segmentScale = gross > 0 ? total / gross : 1;

  // "Your part" depends on how the squad contributes.
  const myTotal = me?.total ?? 0;
  const fairShare = Math.ceil(squad.target_cents / Math.max(1, members.length));
  const weeksLeft = Math.max(
    1,
    Math.ceil((new Date(squad.deadline + "T00:00:00Z").getTime() - now.getTime()) / (7 * 86_400_000)),
  );
  const weeklyPart =
    Math.ceil(Math.max(0, squad.target_cents - total) / weeksLeft / Math.max(1, members.length) / 100) * 100;
  const weekStartIso = weekStart(now).toISOString();
  const myThisWeek = saves
    .filter((s) => s.user_id === userId && s.created_at >= weekStartIso)
    .reduce((a, s) => a + s.amount_cents, 0);
  const deadline = new Date(squad.deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const feed: FeedItem[] = [
    ...saves.map((s) => ({ type: "save" as const, ...s })),
    ...(postsData ?? []).map((p) => ({ type: "post" as const, ...p })),
    ...withdrawals
      .filter((w) => w.status !== "pending")
      .map((w) => ({
        type: "withdrawal" as const,
        ...w,
        user_id: w.requested_by,
        created_at: w.resolved_at ?? w.created_at,
      })),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <header className="flex items-center">
        <Link href="/squads" className="text-xl font-bold" aria-label="Back">
          ‹
        </Link>
        <h1 className="flex-1 pr-4 text-center font-bold">Squad</h1>
      </header>

      <section className="mt-5">
        <h2 className="text-2xl font-extrabold">{squad.name}</h2>
        <p className="text-sm text-muted">
          {members.length} {members.length === 1 ? "friend" : "friends"} · by {deadline}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-black/5 px-2 py-0.5">{MODE_LABEL[squad.contribution_mode as keyof typeof MODE_LABEL]}</span>
          {squad.withdrawals_need_vote && <span className="rounded-full bg-black/5 px-2 py-0.5">🗳️ Withdrawals need a vote</span>}
          {!squad.show_amounts && <span className="rounded-full bg-black/5 px-2 py-0.5">🙈 Amounts hidden</span>}
          {squad.join_league && <span className="rounded-full bg-black/5 px-2 py-0.5">🏆 In the league</span>}
          {squad.created_by === userId && (
            <Link href={`/squads/${squad.id}/settings`} className="ml-auto text-sm font-bold text-brand">
              Settings
            </Link>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold">{formatMoney(total)}</span>
          <span className="text-sm text-muted">of {formatMoney(squad.target_cents)}</span>
          <span className="ml-auto rounded-full bg-lime/60 px-2 py-0.5 text-xs font-bold">{pct}%</span>
        </div>
        {/* One shared bar. With amounts visible, each friend gets a segment in their color. */}
        <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-black/10">
          {squad.show_amounts ? (
            [
              ...rows.filter((r) => !r.hidden).map((r) => ({ key: r.user_id, cents: r.total, color: r.color })),
              { key: "hidden", cents: hiddenTotal, color: "#b9b6c9" },
            ].map((seg) => {
              const share = ((seg.cents * segmentScale) / squad.target_cents) * 100;
              return share > 0 ? (
                <div
                  key={seg.key}
                  className="h-full transition-[width] duration-700"
                  style={{ width: `${Math.min(share, 100)}%`, background: seg.color }}
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
        <p className="mt-2 text-xs text-muted">
          One shared bar. Everyone sees it move.
          {withdrawn > 0 && ` ${formatMoney(withdrawn)} withdrawn so far.`}
        </p>
      </section>

      {squad.contribution_mode === "equal_split" && (
        <section className="mt-4 rounded-3xl bg-card p-5 shadow-sm">
          <div className="flex items-baseline">
            <h3 className="font-bold">Your share</h3>
            <span className="ml-auto text-sm font-bold">
              {formatMoney(myTotal)} <span className="text-muted">/ {formatMoney(fairShare)}</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, (myTotal / fairShare) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Equal split: everyone puts in {formatMoney(fairShare)} ({formatMoney(squad.target_cents)} ÷{" "}
            {members.length}).
          </p>
        </section>
      )}

      {squad.contribution_mode === "weekly_auto" && (
        <section className="mt-4 flex items-center gap-3 rounded-3xl bg-card p-5 shadow-sm">
          <span className="text-2xl">{myThisWeek >= weeklyPart ? "✅" : "🗓️"}</span>
          <div className="flex-1">
            <h3 className="font-bold">
              This week: chip in {formatMoney(weeklyPart)}
            </h3>
            <p className="text-xs text-muted">
              {myThisWeek >= weeklyPart
                ? "Done for this week. Nice!"
                : `You've put in ${formatMoney(myThisWeek)} so far. ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} to go.`}
            </p>
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mt-4 space-y-3">
          {pending.map((w) => {
            const requester = byId.get(w.requested_by);
            const yes = w.withdrawal_votes.filter((v) => v.approve).length;
            const mine = w.withdrawal_votes.find((v) => v.user_id === userId);
            const needed = Math.floor(members.length / 2) + 1;
            return (
              <div key={w.id} className="rounded-3xl border-2 border-flame/30 bg-card p-5">
                <p className="text-xs font-extrabold text-flame">🗳️ VOTE NEEDED</p>
                <p className="mt-1 font-bold">
                  {requester?.label ?? "Someone"} {requester?.isMe ? "want" : "wants"} to withdraw{" "}
                  {formatMoney(w.amount_cents, { showCents: w.amount_cents % 100 !== 0 })}
                </p>
                {w.reason && <p className="text-sm text-muted">&ldquo;{w.reason}&rdquo;</p>}
                <p className="mt-1 text-xs text-muted">
                  {yes} of {needed} approvals needed · {timeAgo(w.created_at, now)}
                </p>
                {w.requested_by !== userId && (
                  <VoteButtons squadId={squad.id} withdrawalId={w.id} myVote={mine ? mine.approve : null} />
                )}
              </div>
            );
          })}
        </section>
      )}

      <div className="mt-4">
        <InviteCard code={squad.invite_code} squadName={squad.name} />
      </div>

      <section className="mt-6">
        <div className="flex items-center">
          <h3 className="font-bold">Who&apos;s in</h3>
          {squad.show_amounts && me && (
            <span className="ml-auto">
              <HideAmountToggle squadId={squad.id} hidden={me.hide_amount} />
            </span>
          )}
        </div>
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <Avatar name={r.displayName} color={r.color} />
              <span className="flex-1 font-semibold">{r.label}</span>
              {!r.isMe && (
                <NudgeButton
                  squadId={squad.id}
                  targetUserId={r.user_id}
                  alreadyNudged={nudgedToday.has(r.user_id)}
                />
              )}
              <span className={`text-sm font-bold ${r.streak > 0 ? "text-flame" : "text-muted"}`}>
                🔥 {r.streak} wk
              </span>
              <span className="w-16 text-right font-bold">{r.hidden ? "•••" : formatMoney(r.total)}</span>
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
            {feed.map((item) => {
              const who = byId.get(item.user_id);
              const name = who?.label ?? "Someone";
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
                  <Avatar name={who?.displayName ?? "?"} color={who?.color ?? "#999"} />
                  <span className="flex-1 text-sm">
                    <strong>{name}</strong>{" "}
                    {item.type === "withdrawal"
                      ? item.status === "approved"
                        ? `withdrew ${formatMoney(item.amount_cents)}${item.reason ? ` for “${item.reason}”` : ""} ✅`
                        : `asked to withdraw ${formatMoney(item.amount_cents)}: turned down by the squad`
                      : item.type === "save"
                      ? who?.hidden
                        ? "chipped in"
                        : `chipped in ${formatMoney(item.amount_cents, { showCents: item.amount_cents % 100 !== 0 })}`
                      : item.kind === "streak"
                        ? `hit a ${item.streak_weeks}-week streak 🔥`
                        : `nudged ${item.target_user_id === userId ? "you" : (byId.get(item.target_user_id ?? "")?.displayName ?? "a friend")} 👋`}
                    <span className="block text-xs text-muted">{timeAgo(item.created_at, now)}</span>
                  </span>
                  {item.type === "save" && (
                    <CheerButton
                      squadId={squad.id}
                      saveId={item.id}
                      count={cheers.get(item.id)?.count ?? 0}
                      cheered={cheers.get(item.id)?.mine ?? false}
                      disabled={item.user_id === userId}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background pt-6 pb-6">
        <SaveSheet
          destination={{ squadId: squad.id }}
          buttonLabel="Chip in"
          title="How much did you save?"
          submitLabel="Add to the squad"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted">Self-reported. No real money moves.</p>
          {total > 0 && <WithdrawButton squadId={squad.id} needsVote={squad.withdrawals_need_vote} />}
        </div>
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
