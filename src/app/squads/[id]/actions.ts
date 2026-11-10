"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

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

export type WithdrawState = { status: "idle" | "done" | "error"; message?: string };

export async function requestWithdrawal(
  squadId: string,
  _prev: WithdrawState,
  formData: FormData,
): Promise<WithdrawState> {
  const { supabase } = await requireUserId(`/squads/${squadId}`);
  const cents = parseDollarsToCents(formData.get("amount"));
  if (!cents) return { status: "error", message: "Enter an amount." };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 140);

  const { error } = await supabase.rpc("request_withdrawal", {
    p_squad_id: squadId,
    p_amount_cents: cents,
    p_reason: reason,
  });
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "done" };
}

export async function voteWithdrawal(squadId: string, withdrawalId: string, approve: boolean) {
  const { supabase } = await requireUserId(`/squads/${squadId}`);
  const { error } = await supabase.rpc("vote_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_approve: approve,
  });
  refresh();
  return { error: error?.message };
}
