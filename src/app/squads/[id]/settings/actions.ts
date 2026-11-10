"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parseSquadForm } from "@/lib/squad-form";
import type { SquadFormState } from "../../squad-form";

// Only the squad's creator can change its settings (enforced by the database too).
export async function updateSquad(
  squadId: string,
  _prev: SquadFormState,
  formData: FormData,
): Promise<SquadFormState> {
  const { supabase, userId } = await requireUserId(`/squads/${squadId}/settings`);

  const parsed = parseSquadForm(formData);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("squads")
    .update(parsed.fields)
    .eq("id", squadId)
    .eq("created_by", userId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only the person who started this squad can change its settings." };

  redirect(`/squads/${squadId}`);
}
