"use client";

import confetti from "canvas-confetti";
import { useEffect, useState, useTransition } from "react";
import { shareStreak } from "./actions";

export function Confetti() {
  useEffect(() => {
    const colors = ["#d4f25c", "#ffffff", "#ff6b2c", "#e5487a"];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.2 }, colors }), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function ShareButton({ weeks, hasSquads }: { weeks: number; hasSquads: boolean }) {
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!hasSquads) return null;

  return (
    <button
      disabled={pending || result !== null}
      onClick={() =>
        start(async () => {
          const r = await shareStreak(weeks);
          setResult(r.error ? r.error : `Shared with ${r.shared} ${r.shared === 1 ? "squad" : "squads"} 🎉`);
        })
      }
      className="w-full rounded-full bg-lime py-3.5 font-bold text-foreground disabled:opacity-80"
    >
      {result ?? (pending ? "Sharing…" : "Share with my squad")}
    </button>
  );
}
