"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export type SaveState = {
  status: "idle" | "done" | "error";
  message?: string;
  amountCents?: number;
  xpGained?: number;
  weekCompleted?: boolean;
};

type Destination = { squadId: string } | { goalId: string };

// Every save goes through public.record_save, which also awards XP.
export async function recordSave(
  destination: Destination,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const { supabase } = await requireUserId();

  const cents = parseDollarsToCents(formData.get("amount"));
  if (!cents) return { status: "error", message: "Enter an amount, like 12 or 12.50." };
  if (cents > 1_000_000) return { status: "error", message: "That's over $10,000. Typo?" };

  const { data, error } = await supabase.rpc("record_save", {
    p_amount_cents: cents,
    p_squad_id: "squadId" in destination ? destination.squadId : null,
    p_goal_id: "goalId" in destination ? destination.goalId : null,
    p_source: "manual",
  });
  if (error) return { status: "error", message: error.message };

  const row = (data as { save_id: string; xp_gained: number; week_completed: boolean }[])[0];

  // Completing your week is the big moment: go to the celebration screen.
  if (row?.week_completed) {
    redirect(`/win?save=${row.save_id}&xp=${row.xp_gained}`);
  }

  refresh();
  return {
    status: "done",
    amountCents: cents,
    xpGained: row?.xp_gained,
    weekCompleted: row?.week_completed,
  };
}
