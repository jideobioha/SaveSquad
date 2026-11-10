"use server";

import { requireUserId } from "@/lib/auth";

// Posts "hit an N-week streak" to the feed of every squad you're in.
export async function shareStreak(weeks: number): Promise<{ shared: number; error?: string }> {
  const { supabase, userId } = await requireUserId("/");
  const { data: memberships } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("user_id", userId);
  const squadIds = (memberships ?? []).map((m) => m.squad_id);
  if (squadIds.length === 0) return { shared: 0 };

  const { error } = await supabase.from("squad_posts").insert(
    squadIds.map((squad_id) => ({ squad_id, user_id: userId, kind: "streak", streak_weeks: weeks })),
  );
  if (error) return { shared: 0, error: error.message };
  return { shared: squadIds.length };
}
