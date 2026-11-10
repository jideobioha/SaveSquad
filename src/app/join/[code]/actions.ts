"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";

export async function joinSquad(code: string) {
  const { supabase } = await requireUserId(`/join/${code}`);
  const { data: squadId, error } = await supabase.rpc("join_squad", { code });
  if (error || !squadId) redirect(`/join/${code}?error=1`);
  redirect(`/squads/${squadId}`);
}
