import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import type { SquadFields } from "@/lib/squad-form";
import { SquadForm } from "../../squad-form";
import { updateSquad } from "./actions";

export default function SquadSettingsPage({ params }: PageProps<"/squads/[id]/settings">) {
  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <Suspense fallback={<PageSpinner />}>
        <SettingsContent params={params} />
      </Suspense>
    </main>
  );
}

async function SettingsContent({ params }: Pick<PageProps<"/squads/[id]/settings">, "params">) {
  const { id } = await params;
  const { supabase, userId } = await requireUserId(`/squads/${id}/settings`);
  const { data: squad } = await supabase
    .from("squads")
    .select(
      "name, target_cents, deadline, contribution_mode, withdrawals_need_vote, show_amounts, join_league, created_by",
    )
    .eq("id", id)
    .maybeSingle<SquadFields & { created_by: string }>();
  if (!squad) notFound();
  if (squad.created_by !== userId) redirect(`/squads/${id}`);

  return (
    <>
      <header className="flex items-center">
        <Link href={`/squads/${id}`} className="text-sm font-semibold text-muted">
          Cancel
        </Link>
        <h1 className="flex-1 pr-12 text-center font-bold">Squad settings</h1>
      </header>
      <div className="mt-6">
        <SquadForm
          action={updateSquad.bind(null, id)}
          defaults={squad}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      </div>
    </>
  );
}
