"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Listens for new saves and members in this squad and re-renders the page,
// so friends see the bar move without refreshing.
export function LiveRefresh({ squadId }: { squadId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const filter = `squad_id=eq.${squadId}`;
    const channel = supabase
      .channel(`squad-${squadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "saves", filter }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members", filter }, () =>
        router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [squadId, router]);

  return null;
}
