"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export async function spendFreeze(): Promise<{ error?: string }> {
  const { supabase } = await requireUserId("/me");
  const { error } = await supabase.rpc("use_freeze");
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updateWeeklyTarget(formData: FormData) {
  const { supabase, userId } = await requireUserId("/me");
  const cents = parseDollarsToCents(formData.get("weekly"));
  if (!cents || cents > 1_000_000) return;
  await supabase.from("profiles").update({ weekly_target_cents: cents }).eq("id", userId);
  refresh();
}
