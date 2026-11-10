import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's id, or sends them to /login.
// Call at the top of every page and Server Action that needs a user.
export async function requireUserId(next?: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return { supabase, userId };
}
