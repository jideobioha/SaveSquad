"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export type ChipInState = { status: "idle" | "done" | "error"; message?: string; at?: number };

const MAX_CENTS = 1_000_000; // $10,000 per save keeps typos from wrecking the bar.

export async function chipIn(
  squadId: string,
  _prev: ChipInState,
  formData: FormData,
): Promise<ChipInState> {
  const { supabase, userId } = await requireUserId(`/squads/${squadId}`);

  const cents = parseDollarsToCents(formData.get("amount"));
  if (!cents) return { status: "error", message: "Enter an amount, like 12 or 12.50." };
  if (cents > MAX_CENTS) return { status: "error", message: "That's over $10,000. Typo?" };

  // RLS also checks membership; this just gives a clearer error.
  const { error } = await supabase
    .from("saves")
    .insert({ user_id: userId, squad_id: squadId, amount_cents: cents, source: "manual" });
  if (error) return { status: "error", message: error.message };

  refresh();
  return { status: "done", message: String(cents), at: Date.now() };
}
