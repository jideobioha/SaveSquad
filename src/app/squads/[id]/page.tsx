import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SaveSheet } from "@/components/save-sheet";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { getStreaks } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/streaks";
import { InviteCard } from "./invite-card";
import { LiveRefresh } from "./live-refresh";

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
type FeedItem = ({ type: "save" } & Save) | ({ type: "post" } & Post);

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

  const [{ data: squad }, { data: membersData }, { data: savesData }, { data: postsData }] =
    await Promise.all([
      supabase
        .from("squads")
        .select("id, name, target_cents, deadline, invite_code, show_amounts")
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
    ]);

  if (!squad) notFound();
  const members = membersData ?? [];
  const saves = savesData ?? [];
  const streaks = await getStreaks(supabase, members.map((m) => m.user_id));
  const now = new Date();

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

  const total = saves.reduce((a, s) => a + s.amount_cents, 0);
  const pct = Math.min(100, Math.round((total / squad.target_cents) * 100));
  const deadline = new Date(squad.deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const feed: FeedItem[] = [
    ...saves.map((s) => ({ type: "save" as const, ...s })),
    ...(postsData ?? []).map((p) => ({ type: "post" as const, ...p })),
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

      <div className="mt-4">
        <InviteCard code={squad.invite_code} squadName={squad.name} />
      </div>

      <section className="mt-6">
        <h3 className="font-bold">Who&apos;s in</h3>
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <Avatar name={r.displayName} color={r.color} />
              <span className="flex-1 font-semibold">{r.label}</span>
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
                    {item.type === "save"
                      ? who?.hidden
                        ? "chipped in"
                        : `chipped in ${formatMoney(item.amount_cents, { showCents: item.amount_cents % 100 !== 0 })}`
                      : item.kind === "streak"
                        ? `hit a ${item.streak_weeks}-week streak 🔥`
                        : `nudged ${item.target_user_id === userId ? "you" : (byId.get(item.target_user_id ?? "")?.displayName ?? "a friend")} 👋`}
                    <span className="block text-xs text-muted">{timeAgo(item.created_at, now)}</span>
                  </span>
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
