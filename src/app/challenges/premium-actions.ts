"use server";

import { requireUserId } from "@/lib/auth";

// Pricing test: we only count views and taps. Nothing is charged.

export async function logPremiumView(priceCents: number) {
  const { supabase } = await requireUserId("/challenges");
  await supabase.rpc("premium_seen", { p_price_cents: priceCents });
}

export async function joinPremiumWaitlist(priceCents: number): Promise<{ error?: string }> {
  const { supabase } = await requireUserId("/challenges");
  const { error } = await supabase.rpc("join_premium_waitlist", { p_price_cents: priceCents });
  return error ? { error: "Couldn't add you. Try again." } : {};
}
