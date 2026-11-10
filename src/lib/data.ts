import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  display_name: string;
  avatar_color: string;
  xp: number;
  level: number;
  weekly_target_cents: number;
  onboarded: boolean;
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
    .select("id, display_name, avatar_color, xp, level, weekly_target_cents, onboarded")
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
