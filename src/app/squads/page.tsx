import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { getSquadTotals } from "@/lib/data";
import { formatMoney } from "@/lib/money";

type Row = {
  squads: { id: string; name: string; target_cents: number; deadline: string } | null;
};

export default function SquadsPage() {
  return (
    <>
      <main className="flex flex-1 flex-col px-5 py-6">
        <header className="flex items-center">
          <h1 className="text-2xl font-extrabold">Squads</h1>
          <Link
            href="/squads/new"
            className="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
          >
            + New
          </Link>
        </header>
        <Suspense fallback={<PageSpinner />}>
          <SquadList />
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}

async function SquadList() {
  const { supabase, userId } = await requireUserId("/squads");
  const { data } = await supabase
    .from("squad_members")
    .select("squads(id, name, target_cents, deadline)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .returns<Row[]>();
  const squads = (data ?? []).flatMap((r) => (r.squads ? [r.squads] : []));

  if (squads.length === 0) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-4xl">👥</p>
        <h2 className="mt-3 text-xl font-bold">Save together</h2>
        <p className="mt-2 text-sm text-muted">
          Start a shared goal, like a trip, and invite friends with a link.
        </p>
      </div>
    );
  }

  const totals = await getSquadTotals(supabase, squads.map((s) => s.id));

  return (
    <ul className="mt-5 space-y-3">
      {squads.map((sq) => {
        const saved = totals.get(sq.id) ?? 0;
        const pct = Math.min(100, Math.round((saved / sq.target_cents) * 100));
        const by = new Date(sq.deadline + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        return (
          <li key={sq.id}>
            <Link href={`/squads/${sq.id}`} className="block rounded-3xl bg-card p-5 shadow-sm">
              <div className="flex items-baseline">
                <span className="font-bold">{sq.name}</span>
                <span className="ml-auto text-xs font-bold text-muted">{pct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {formatMoney(saved)} of {formatMoney(sq.target_cents)} · by {by}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
