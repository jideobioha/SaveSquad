import Link from "next/link";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { OnboardingForm } from "../../onboarding/onboarding-form";

export default function NewGoalPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <header className="flex items-center">
        <Link href="/goals" className="text-sm font-semibold text-muted">
          Cancel
        </Link>
        <h1 className="flex-1 pr-12 text-center font-bold">New goal</h1>
      </header>
      <h2 className="mt-6 text-2xl font-extrabold">What else are you saving for?</h2>
      <div className="mt-5">
        <Suspense fallback={<PageSpinner />}>
          <SignedIn />
        </Suspense>
      </div>
    </main>
  );
}

async function SignedIn() {
  await requireUserId("/goals/new");
  return <OnboardingForm mode="add" />;
}
