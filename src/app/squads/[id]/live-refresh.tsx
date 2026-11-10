"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Listens for new saves, members, posts and cheers in this squad and re-renders the page,
// so friends see the bar move without refreshing.
export function LiveRefresh({ squadId }: { squadId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Realtime enforces the same privacy rules as the database, so it must
      // know who's signed in *before* subscribing. Otherwise it connects as
      // a logged-out visitor and every event is filtered out.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }

      const filter = `squad_id=eq.${squadId}`;
      channel = supabase
        .channel(`squad-${squadId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "saves", filter }, () =>
          router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "squad_members", filter },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "squad_posts", filter },
          () => router.refresh(),
        )
        // Cheers have no squad column; the database's privacy rules limit
        // these events to squads you're in.
        .on("postgres_changes", { event: "*", schema: "public", table: "cheers" }, () =>
          router.refresh(),
        )
        .subscribe((status, err) => {
          if (process.env.NODE_ENV === "development") {
            console.log(`[live] squad ${squadId.slice(0, 8)}: ${status}`, err ?? "");
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [squadId, router]);

  return null;
}
