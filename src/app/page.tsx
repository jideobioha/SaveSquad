import Link from "next/link";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { formatMoney } from "@/lib/money";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_color")
    .eq("id", userId)
    .single();

  const name = profile?.display_name || "there";

  const { data: memberships } = await supabase
    .from("squad_members")
    .select("squads(id, name, target_cents)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .returns<{ squads: { id: string; name: string; target_cents: number } | null }[]>();
  const squads = (memberships ?? []).flatMap((m) => (m.squads ? [m.squads] : []));

  const totals = new Map<string, number>();
  if (squads.length > 0) {
    const { data: saves } = await supabase
      .from("saves")
      .select("squad_id, amount_cents")
      .in("squad_id", squads.map((s) => s.id));
    for (const s of saves ?? []) {
      if (s.squad_id) totals.set(s.squad_id, (totals.get(s.squad_id) ?? 0) + s.amount_cents);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center gap-3">
        <span
          className="flex size-11 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: profile?.avatar_color ?? "#5b3ff0" }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="text-sm text-muted">Good to see you</p>
          <p className="text-lg font-bold">{name}</p>
        </div>
        <form action={signOut} className="ml-auto">
          <button className="text-sm font-semibold text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-8">
        <div className="flex items-center">
          <h2 className="text-lg font-bold">Your squads</h2>
          <Link href="/squads/new" className="ml-auto text-sm font-bold text-brand">
            + New squad goal
          </Link>
        </div>

        {squads.length === 0 ? (
          <div className="mt-3 rounded-3xl bg-card p-6 text-center shadow-sm">
            <p className="text-4xl">🎯</p>
            <h3 className="mt-3 text-xl font-bold">No squads yet</h3>
            <p className="mt-2 text-sm text-muted">
              Start a shared goal, like a trip, and invite your friends.
            </p>
            <Link
              href="/squads/new"
              className="mt-5 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white"
            >
              Create a squad goal
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {squads.map((sq) => {
              const saved = totals.get(sq.id) ?? 0;
              const pct = Math.min(100, Math.round((saved / sq.target_cents) * 100));
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
  );
}
