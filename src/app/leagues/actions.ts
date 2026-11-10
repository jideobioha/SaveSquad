"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";

export type DuelFormState = { error?: string; done?: boolean };

export async function createDuel(_prev: DuelFormState, formData: FormData): Promise<DuelFormState> {
  const { supabase } = await requireUserId("/leagues?tab=duels");
  const opponent = String(formData.get("opponent") ?? "");
  const challenge = String(formData.get("challenge") ?? "").trim();
  const stakeInput = String(formData.get("stake") ?? "0");
  const stake = stakeInput === "0" ? 0 : parseDollarsToCents(stakeInput);

  if (!opponent) return { error: "Pick a friend to duel." };
  if (!challenge || challenge.length > 60) return { error: "Name the challenge (up to 60 characters)." };
  if (stake === null || stake > 10_000) return { error: "Stake must be $0–$100." };

  const { error } = await supabase.rpc("create_duel", {
    p_opponent: opponent,
    p_challenge: challenge,
    p_stake_cents: stake,
  });
  if (error) return { error: error.message };
  refresh();
  return { done: true };
}

async function call(fn: string, args: Record<string, unknown>) {
  const { supabase } = await requireUserId("/leagues?tab=duels");
  const { error } = await supabase.rpc(fn, args);
  refresh();
  return { error: error?.message };
}

export async function respondDuel(duelId: string, accept: boolean) {
  return call("respond_duel", { p_duel_id: duelId, p_accept: accept });
}

export async function checkInDuel(duelId: string) {
  return call("check_in_duel", { p_duel_id: duelId });
}

export async function markDuelPaid(duelId: string) {
  return call("mark_duel_paid", { p_duel_id: duelId });
}
