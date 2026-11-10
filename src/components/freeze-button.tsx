"use client";

import { useState, useTransition } from "react";
import { spendFreeze } from "@/app/me/actions";

export function FreezeButton({ freezes, className }: { freezes: number; className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <button
        disabled={pending || freezes < 1}
        onClick={() => {
          if (!confirm("Use a streak freeze for this week? Your streak stays safe even if you don't save.")) return;
          start(async () => {
            const r = await spendFreeze();
            setError(r.error ?? null);
          });
        }}
        className={
          className ??
          "w-full rounded-full bg-sky-100 py-3 text-sm font-bold text-sky-800 disabled:opacity-50"
        }
      >
        ❄️ {pending ? "Freezing…" : `Use a freeze (${freezes})`}
      </button>
      {error && <p className="mt-2 text-center text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
