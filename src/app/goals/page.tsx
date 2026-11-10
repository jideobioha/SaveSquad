import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SaveSheet } from "@/components/save-sheet";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { GOAL_EMOJI, getActiveGoal, getGoals } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { makeMainGoal } from "./actions";

export default function GoalsPage() {
  return (
    <>
      <main className="flex flex-1 flex-col px-5 py-6">
        <header className="flex items-center">
          <Link href="/" className="text-xl font-bold" aria-label="Back">
            ‹
          </Link>
          <h1 className="ml-3 text-2xl font-extrabold">Your goals</h1>
          <Link
            href="/goals/new"
            className="ml-auto rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
          >
            + Add
          </Link>
        </header>
        <p className="mt-1 text-sm text-muted">
          Save solo toward as many goals as you like. Every save counts toward your streak.
        </p>
        <Suspense fallback={<PageSpinner />}>
          <GoalList />
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}

async function GoalList() {
  const { supabase, userId } = await requireUserId("/goals");
  const [goals, main, { data: saves }] = await Promise.all([
    getGoals(supabase, userId),
    getActiveGoal(supabase, userId),
    supabase.from("saves").select("goal_id, amount_cents").eq("user_id", userId).not("goal_id", "is", null),
  ]);

  const totals = new Map<string, number>();
  for (const s of saves ?? []) {
    if (s.goal_id) totals.set(s.goal_id, (totals.get(s.goal_id) ?? 0) + s.amount_cents);
  }

  return (
    <ul className="mt-5 space-y-3">
      {goals.map((g) => {
        const saved = totals.get(g.id) ?? 0;
        const pct = Math.min(100, Math.round((saved / g.target_cents) * 100));
        const isMain = g.id === main?.id;
        const by = new Date(g.deadline + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        return (
          <li
            key={g.id}
            className={`rounded-3xl p-5 shadow-sm ${isMain ? "bg-brand text-white" : "bg-card"}`}
          >
            <div className="flex items-center">
              <span className="text-lg font-extrabold">
                {GOAL_EMOJI[g.kind]} {g.name}
              </span>
              {isMain ? (
                <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-[11px] font-extrabold text-foreground">
                  MAIN
                </span>
              ) : (
                <form action={makeMainGoal.bind(null, g.id)} className="ml-auto">
                  <button className="text-xs font-bold text-brand">Make main</button>
                </form>
              )}
            </div>
            <div className={`mt-3 h-2 overflow-hidden rounded-full ${isMain ? "bg-white/20" : "bg-black/10"}`}>
              <div
                className={`h-full rounded-full ${isMain ? "bg-lime" : "bg-brand"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={`mt-2 flex text-xs ${isMain ? "text-white" : "text-muted"}`}>
              <span>
                {formatMoney(saved)} of {formatMoney(g.target_cents)} · {pct}%
              </span>
              <span className="ml-auto">by {by}</span>
            </div>
            <div className="mt-3">
              <SaveSheet
                destination={{ goalId: g.id }}
                buttonLabel={pct >= 100 ? "🎯 Reached! Save extra" : "Save"}
                title={`Save to ${g.name}`}
                submitLabel={`Add to ${g.name}`}
                buttonClassName={`rounded-full px-5 py-2 text-sm font-bold ${
                  isMain ? "bg-white text-brand" : "bg-brand text-white"
                }`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
