import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandTone } from "@/components/brand-tone";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { joinSquad } from "./actions";

type Preview = {
  id: string;
  name: string;
  target_cents: number;
  deadline: string;
  member_count: number;
};

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({ params }: Pick<PageProps<"/join/[code]">, "params">) {
  const { code } = await params;
  const { supabase, userId } = await requireUserId(`/join/${code}`);

  const { data } = await supabase.rpc("squad_preview", { code });
  const squad = (data as Preview[] | null)?.[0];

  if (!squad) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl">🤔</p>
        <h1 className="mt-3 text-2xl font-bold">Invite not found</h1>
        <p className="mt-2 text-muted">Ask your friend to send the link again.</p>
        <Link href="/" className="mt-6 rounded-full bg-brand px-6 py-3 font-bold text-white">
          Go home
        </Link>
      </main>
    );
  }

  // Already in? Skip straight to the squad.
  const { data: membership } = await supabase
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squad.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (membership) redirect(`/squads/${squad.id}`);

  const deadline = new Date(squad.deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main data-tone="brand" className="flex flex-1 flex-col justify-between bg-brand px-6 py-12 text-white">
      <BrandTone />
      <div className="mt-12">
        <p className="font-semibold text-lime">You&apos;re invited to save together</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{squad.name}</h1>
        <p className="mt-4 text-white">
          {formatMoney(squad.target_cents)} by {deadline} · {squad.member_count}{" "}
          {Number(squad.member_count) === 1 ? "member" : "members"} so far
        </p>
      </div>
      <form action={joinSquad.bind(null, code)}>
        <button className="w-full rounded-full bg-lime py-3.5 font-bold text-foreground">
          Join squad
        </button>
      </form>
    </main>
  );
}
