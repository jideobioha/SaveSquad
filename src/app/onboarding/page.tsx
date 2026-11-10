import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <p className="text-sm font-bold text-brand">Step 1 of 1</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">What are you saving for?</h1>
      <p className="mt-2 text-muted">
        Your goal becomes your game. Every save fills the bar and levels you up.
      </p>
      <div className="mt-6">
        <Suspense fallback={<PageSpinner />}>
          <SignedIn />
        </Suspense>
      </div>
    </main>
  );
}

async function SignedIn() {
  await requireUserId("/onboarding");
  return <OnboardingForm />;
}
