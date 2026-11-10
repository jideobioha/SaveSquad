import Link from "next/link";
import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { requireUserId } from "@/lib/auth";
import { SquadForm } from "../squad-form";
import { createSquad } from "./actions";

export default function NewSquadPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <header className="flex items-center">
        <Link href="/" className="text-sm font-semibold text-muted">
          Cancel
        </Link>
        <h1 className="flex-1 pr-12 text-center font-bold">New squad goal</h1>
      </header>
      <Suspense fallback={<PageSpinner />}>
        <SignedInForm />
      </Suspense>
    </main>
  );
}

async function SignedInForm() {
  await requireUserId("/squads/new");
  return (
    <div className="mt-6">
      <SquadForm action={createSquad} submitLabel="Create squad & invite" pendingLabel="Creating…" />
    </div>
  );
}
