"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export type OnboardingState = { error?: string };

const KINDS = ["trip", "emergency", "down_payment", "other"] as const;

export async function startStreak(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { supabase, userId } = await requireUserId("/onboarding");

  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const targetCents = parseDollarsToCents(formData.get("target"));
  const weeklyCents = parseDollarsToCents(formData.get("weekly"));
  const deadline = String(formData.get("deadline") ?? "");

  if (!KINDS.includes(kind as (typeof KINDS)[number])) return { error: "Pick what you're saving for." };
  if (!name || name.length > 60) return { error: "Give your goal a name." };
  if (!targetCents) return { error: "Enter a target amount." };
  if (!deadline || new Date(deadline) <= new Date()) return { error: "Pick a date in the future." };
  if (!weeklyCents) return { error: "Enter a weekly amount." };

  const { error } = await supabase
    .from("goals")
    .insert({ user_id: userId, kind, name, target_cents: targetCents, deadline });
  if (error) return { error: error.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ weekly_target_cents: weeklyCents, onboarded: true })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };

  redirect("/");
}
