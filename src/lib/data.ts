import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  display_name: string;
  avatar_color: string;
  xp: number;
  level: number;
  weekly_target_cents: number;
  onboarded: boolean;
  freezes: number;
};

export type Streak = {
  user_id: string;
  current_weeks: number;
  best_weeks: number;
  this_week_cents: number | null;
};

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_color, xp, level, weekly_target_cents, onboarded, freezes")
    .eq("id", userId)
    .single<Profile>();
  return data;
}

export async function getStreaks(supabase: SupabaseClient, userIds: string[]) {
  const { data } = await supabase.rpc("user_streaks", { uids: userIds });
  return new Map(((data ?? []) as Streak[]).map((s) => [s.user_id, s]));
}

export type Goal = {
  id: string;
  kind: "trip" | "emergency" | "down_payment" | "other";
  name: string;
  target_cents: number;
  deadline: string;
};

// Phase 2 has one active goal per person: the most recent.
export async function getActiveGoal(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("goals")
    .select("id, kind, name, target_cents, deadline")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Goal>();
  return data;
}

export const GOAL_EMOJI: Record<Goal["kind"], string> = {
  trip: "✈️",
  emergency: "🛟",
  down_payment: "🏠",
  other: "✨",
};

// Squad balances: everything chipped in, minus approved withdrawals.
export async function getSquadTotals(supabase: SupabaseClient, squadIds: string[]) {
  const totals = new Map<string, number>();
  if (squadIds.length === 0) return totals;
  const [{ data: saves }, { data: withdrawals }] = await Promise.all([
    supabase.from("saves").select("squad_id, amount_cents").in("squad_id", squadIds),
    supabase
      .from("withdrawals")
      .select("squad_id, amount_cents")
      .in("squad_id", squadIds)
      .eq("status", "approved"),
  ]);
  for (const s of saves ?? []) {
    totals.set(s.squad_id, (totals.get(s.squad_id) ?? 0) + s.amount_cents);
  }
  for (const w of withdrawals ?? []) {
    totals.set(w.squad_id, (totals.get(w.squad_id) ?? 0) - w.amount_cents);
  }
  return totals;
}
