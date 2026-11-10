"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";

export async function makeMainGoal(goalId: string) {
  const { supabase } = await requireUserId("/goals");
  await supabase.rpc("set_primary_goal", { p_goal_id: goalId });
  refresh();
}
