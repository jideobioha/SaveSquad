"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export type CreateSquadState = { error?: string };

const MODES = ["anytime", "equal_split", "weekly_auto"] as const;

export async function createSquad(
  _prev: CreateSquadState,
  formData: FormData,
): Promise<CreateSquadState> {
  const { supabase, userId } = await requireUserId("/squads/new");

  const name = String(formData.get("name") ?? "").trim();
  const targetCents = parseDollarsToCents(formData.get("target"));
  const deadline = String(formData.get("deadline") ?? "");
  const mode = String(formData.get("mode") ?? "anytime");

  if (!name || name.length > 60) return { error: "Give your goal a name (up to 60 characters)." };
  if (!targetCents) return { error: "Enter a target amount, like 8000." };
  if (!deadline || new Date(deadline) <= new Date()) return { error: "Pick a deadline in the future." };
  if (!MODES.includes(mode as (typeof MODES)[number])) return { error: "Pick how you'll contribute." };

  const { data: squad, error } = await supabase
    .from("squads")
    .insert({
      name,
      target_cents: targetCents,
      deadline,
      contribution_mode: mode,
      withdrawals_need_vote: formData.get("withdrawals_need_vote") === "on",
      show_amounts: formData.get("show_amounts") === "on",
      join_league: formData.get("join_league") === "on",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !squad) return { error: error?.message ?? "Couldn't create the squad." };

  const { error: memberError } = await supabase
    .from("squad_members")
    .insert({ squad_id: squad.id, user_id: userId });

  if (memberError) return { error: memberError.message };

  redirect(`/squads/${squad.id}?created=1`);
}
