import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { ChipIn } from "./chip-in";
import { InviteCard } from "./invite-card";
import { LiveRefresh } from "./live-refresh";

type Member = {
  user_id: string;
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

  const [{ data: squad }, { data: members }, { data: saves }] = await Promise.all([
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
    supabase.from("saves").select("user_id, amount_cents").eq("squad_id", id),
  ]);

  if (!squad) notFound();

  const totals = new Map<string, number>();
  for (const s of saves ?? []) {
    totals.set(s.user_id, (totals.get(s.user_id) ?? 0) + s.amount_cents);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const pct = Math.min(100, Math.round((total / squad.target_cents) * 100));
  const deadline = new Date(squad.deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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
          {members?.length ?? 0} {members?.length === 1 ? "friend" : "friends"} · by {deadline}
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
            members?.map((m) => {
              const share = ((totals.get(m.user_id) ?? 0) / squad.target_cents) * 100;
              return share > 0 ? (
                <div
                  key={m.user_id}
                  className="h-full transition-[width] duration-700"
                  style={{ width: `${Math.min(share, 100)}%`, background: m.profiles?.avatar_color }}
                />
              ) : null;
            })
          ) : (
            <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
          )}
        </div>
        <p className="mt-2 text-xs text-muted">One shared bar. Everyone sees it move.</p>
      </section>

      <div className="mt-4">
        <InviteCard code={squad.invite_code} squadName={squad.name} />
      </div>

      <section className="mt-6 mb-4">
        <h3 className="font-bold">Who&apos;s in</h3>
        <ul className="mt-2 space-y-2">
          {members?.map((m) => {
            const name = m.profiles?.display_name || "Friend";
            const isMe = m.user_id === userId;
            const hidden = !isMe && (m.hide_amount || !squad.show_amounts);
            return (
              <li key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
                <span
                  className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: m.profiles?.avatar_color }}
                >
                  {name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 font-semibold">{isMe ? "You" : name}</span>
                <span className="font-bold">
                  {hidden ? "•••" : formatMoney(totals.get(m.user_id) ?? 0)}
                </span>
              </li>
            );
          })}
        </ul>
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
