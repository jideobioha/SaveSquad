"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";

export async function toggleCheer(squadId: string, saveId: string, cheered: boolean) {
  const { supabase, userId } = await requireUserId(`/squads/${squadId}`);
  if (cheered) {
    await supabase.from("cheers").delete().eq("save_id", saveId).eq("user_id", userId);
  } else {
    await supabase.from("cheers").insert({ save_id: saveId, user_id: userId });
    await supabase.rpc("refresh_my_badges"); // Team Player
  }
  refresh();
}

// One nudge per friend per day, so it stays friendly.
export async function nudge(squadId: string, targetUserId: string) {
  const { supabase, userId } = await requireUserId(`/squads/${squadId}`);
  if (targetUserId === userId) return;

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("squad_posts")
    .select("id", { count: "exact", head: true })
    .eq("squad_id", squadId)
    .eq("user_id", userId)
    .eq("target_user_id", targetUserId)
    .eq("kind", "nudge")
    .gte("created_at", since);
  if ((count ?? 0) > 0) return;

  await supabase
    .from("squad_posts")
    .insert({ squad_id: squadId, user_id: userId, kind: "nudge", target_user_id: targetUserId });
  refresh();
}

export async function setHideAmount(squadId: string, hide: boolean) {
  const { supabase, userId } = await requireUserId(`/squads/${squadId}`);
  await supabase
    .from("squad_members")
    .update({ hide_amount: hide })
    .eq("squad_id", squadId)
    .eq("user_id", userId);
  refresh();
}
