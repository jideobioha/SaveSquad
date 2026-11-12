import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { getActiveGoal } from "@/lib/data";
import { PremiumCard } from "./premium-card";
import { Wheel } from "./wheel";

const AMOUNTS = [500, 1000, 2000, 300, 1200, 800, 1500, 2500];

// Pricing test (supabase/migrations/0005_premium_test.sql). Changing the
// price starts a fresh count for the new price.
const PREMIUM_PRICE_CENTS = 399;

export default function ChallengesPage({ searchParams }: PageProps<"/challenges">) {
  return (
    <>
      <main className="flex flex-1 flex-col px-5 py-6">
        <header className="flex items-center">
          <Link href="/" className="text-xl font-bold" aria-label="Back">
            ‹
          </Link>
          <h1 className="flex-1 text-center font-bold">Daily challenge</h1>
          <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-extrabold">+20 XP</span>
        </header>
        <h2 className="mt-6 text-center text-3xl font-extrabold">Spin the Save</h2>
        <p className="mt-1 text-center text-sm text-muted">
          Spin once a day. Wherever it lands, you save it.
        </p>
        <Suspense fallback={<PageSpinner />}>
          <SpinContent searchParams={searchParams} />
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}

async function SpinContent({ searchParams }: Pick<PageProps<"/challenges">, "searchParams">) {
  const { supabase, userId } = await requireUserId("/challenges");
  const goal = await getActiveGoal(supabase, userId);
  if (!goal) redirect("/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: spin }, { data: premium }] = await Promise.all([
    supabase
      .from("spins")
      .select("amount_cents, status")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle<{ amount_cents: number; status: "pending" | "saved" }>(),
    supabase
      .from("premium_interest")
      .select("joined_at")
      .eq("user_id", userId)
      .eq("price_cents", PREMIUM_PRICE_CENTS)
      .maybeSingle<{ joined_at: string | null }>(),
  ]);

  const { error } = await searchParams;

  return (
    <>
      {typeof error === "string" && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error === "amount" ? "Enter a valid amount." : error}
        </p>
      )}
      <Wheel
        goalId={goal.id}
        goalName={goal.name}
        initial={
          spin
            ? { amountCents: spin.amount_cents, status: spin.status, segment: AMOUNTS.indexOf(spin.amount_cents) }
            : null
        }
      />
      <PremiumCard priceCents={PREMIUM_PRICE_CENTS} joined={Boolean(premium?.joined_at)} />
    </>
  );
}
