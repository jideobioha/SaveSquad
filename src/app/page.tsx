import { Suspense } from "react";
import { PageSpinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Landing } from "./landing";

export default function Home() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) return <Landing />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_color")
    .eq("id", userId)
    .single();

  const name = profile?.display_name || "there";

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center gap-3">
        <span
          className="flex size-11 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: profile?.avatar_color ?? "#5b3ff0" }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="text-sm text-muted">Good to see you</p>
          <p className="text-lg font-bold">{name}</p>
        </div>
        <form action={signOut} className="ml-auto">
          <button className="text-sm font-semibold text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-8 rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-4xl">🎯</p>
        <h2 className="mt-3 text-xl font-bold">No squads yet</h2>
        <p className="mt-2 text-sm text-muted">
          Squad goals are coming next: pick a goal, invite friends, watch the bar move.
        </p>
      </section>
    </main>
  );
}
