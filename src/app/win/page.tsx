import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { getProfile, getStreaks } from "@/lib/data";
import { levelProgress } from "@/lib/levels";
import { formatMoney } from "@/lib/money";
import { Confetti, ShareButton } from "./celebration";

type Save = {
  id: string;
  amount_cents: number;
  goal_id: string | null;
  squad_id: string | null;
  goals: { name: string; target_cents: number } | null;
  squads: { name: string; target_cents: number } | null;
};

export default function WinPage({ searchParams }: PageProps<"/win">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <WinContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WinContent({ searchParams }: Pick<PageProps<"/win">, "searchParams">) {
  const { save: saveId, xp } = await searchParams;
  const { supabase, userId } = await requireUserId("/");
  if (typeof saveId !== "string") redirect("/");

  const { data: save } = await supabase
    .from("saves")
    .select("id, amount_cents, goal_id, squad_id, goals(name, target_cents), squads(name, target_cents)")
    .eq("id", saveId)
    .eq("user_id", userId)
    .maybeSingle<Save>();
  if (!save) redirect("/");

  const [profile, streaks, { data: destSaves }, { count: squadCount }] = await Promise.all([
    getProfile(supabase, userId),
    getStreaks(supabase, [userId]),
    save.goal_id
      ? supabase.from("saves").select("amount_cents").eq("goal_id", save.goal_id)
      : supabase.from("saves").select("amount_cents").eq("squad_id", save.squad_id!),
    supabase.from("squad_members").select("squad_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (!profile) redirect("/");

  const streak = streaks.get(userId);
  const weeks = streak?.current_weeks ?? 0;
  const best = streak?.best_weeks ?? 0;
  const thisWeek = streak?.this_week_cents ?? 0;
  const weekCompleted =
    thisWeek >= profile.weekly_target_cents && thisWeek - save.amount_cents < profile.weekly_target_cents;

  const dest = save.goals ?? save.squads;
  const destTotal = (destSaves ?? []).reduce((a, s) => a + s.amount_cents, 0);
  const destPct = dest ? Math.min(100, Math.round((destTotal / dest.target_cents) * 100)) : 0;

  const xpGained = Number(xp) || 0;
  const before = levelProgress(Math.max(0, profile.xp - xpGained)).level;
  const now = levelProgress(profile.xp).level;

  return (
    <main className="flex flex-1 flex-col items-center bg-brand px-6 py-10 text-center text-white">
      <Confetti />

      {/* Streak ring */}
      <div className="relative mt-6 size-44">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#d4f25c"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={weekCompleted ? 0 : 2 * Math.PI * 44 * (1 - Math.min(1, thisWeek / profile.weekly_target_cents))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">🔥</span>
          <span className="text-5xl font-extrabold leading-none">{weeks}</span>
          <span className="text-xs font-bold tracking-widest text-white/70">WEEKS</span>
        </div>
      </div>

      <h1 className="mt-6 text-3xl font-extrabold">{weekCompleted ? "Streak saved!" : "Nice save!"}</h1>
      <p className="mt-1 text-white/80">
        {weekCompleted
          ? weeks > 1 && weeks >= best
            ? `${weeks} weeks in a row. Your longest yet.`
            : `${weeks} ${weeks === 1 ? "week" : "weeks"} in a row.`
          : `${formatMoney(profile.weekly_target_cents - thisWeek, { showCents: true })} more this week to keep your streak.`}
      </p>

      <div className="mt-6 grid w-full grid-cols-3 gap-2">
        <Stat value={`+${formatMoney(save.amount_cents, { showCents: save.amount_cents % 100 !== 0 })}`} label={`to ${dest?.name ?? "your goal"}`} />
        <Stat value={`+${xpGained}`} label="XP earned" />
        <Stat value={`${destPct}%`} label={save.goal_id ? "to your goal" : "squad goal"} />
      </div>

      {now > before && (
        <div className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left text-foreground">
          <span className="flex size-11 items-center justify-center rounded-full bg-lime text-xl">⭐</span>
          <span>
            <span className="block text-xs font-extrabold text-brand">LEVEL UP</span>
            <span className="block font-bold">You reached Level {now}</span>
          </span>
        </div>
      )}

      <div className="mt-auto w-full space-y-2 pt-8">
        {weekCompleted && <ShareButton weeks={weeks} hasSquads={(squadCount ?? 0) > 0} />}
        <Link href="/" className="block w-full py-3 font-bold text-white/90">
          Done
        </Link>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-3">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="truncate text-[11px] text-white/70">{label}</p>
    </div>
  );
}
