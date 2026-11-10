"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";
import { winUrl, type SaveRow } from "@/lib/win-url";

export type SpinResult = { amountCents: number; segment: number; status: "pending" | "saved" };

// Spins (or returns today's existing spin). The amount is picked by the
// database so refreshing can't reroll it.
export async function spin(): Promise<SpinResult | { error: string }> {
  const { supabase } = await requireUserId("/challenges");
  const { data, error } = await supabase.rpc("spin_today");
  if (error) return { error: error.message };
  const row = (data as { amount_cents: number; status: "pending" | "saved"; segment: number }[])[0];
  return { amountCents: row.amount_cents, segment: row.segment, status: row.status };
}

export async function saveSpin(goalId: string, formData: FormData) {
  const { supabase } = await requireUserId("/challenges");
  const cents = parseDollarsToCents(formData.get("amount"));
  if (!cents) redirect("/challenges?error=amount");

  const { data, error } = await supabase.rpc("record_save", {
    p_amount_cents: cents,
    p_goal_id: goalId,
    p_source: "spin",
  });
  if (error) redirect(`/challenges?error=${encodeURIComponent(error.message)}`);

  redirect(winUrl((data as SaveRow[])[0]));
}
