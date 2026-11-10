"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseSquadForm } from "@/lib/squad-form";
import type { SquadFormState } from "../squad-form";

export async function createSquad(_prev: SquadFormState, formData: FormData): Promise<SquadFormState> {
  const { supabase, userId } = await requireUserId("/squads/new");

  const parsed = parseSquadForm(formData);
  if ("error" in parsed) return parsed;

  const { data: squad, error } = await supabase
    .from("squads")
    .insert({ ...parsed.fields, created_by: userId })
    .select("id")
    .single();
  if (error || !squad) return { error: error?.message ?? "Couldn't create the squad." };

  const { error: memberError } = await supabase
    .from("squad_members")
    .insert({ squad_id: squad.id, user_id: userId });
  if (memberError) return { error: memberError.message };

  await supabase.rpc("refresh_my_badges"); // Squad Starter

  redirect(`/squads/${squad.id}?created=1`);
}
