"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatMoney } from "@/lib/money";
import { joinPremiumWaitlist, logPremiumView } from "./premium-actions";

// Pricing test card. A view is logged once the card is at least half on
// screen (not on prefetch, not when scrolled out of sight). A tap is logged
// once; nothing is charged.
export function PremiumCard({ priceCents, joined }: { priceCents: number; joined: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(joined);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          void logPremiumView(priceCents);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priceCents]);

  return (
    <div ref={ref} className="mt-8 w-full rounded-3xl bg-brand p-5 text-center text-white">
      <p className="text-xs font-extrabold tracking-wider">✨ SAVESQUAD PREMIUM</p>
      {done ? (
        <p className="mt-3 text-xl font-extrabold">You&apos;re on the list!</p>
      ) : (
        <>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                setDone(true);
                const r = await joinPremiumWaitlist(priceCents);
                if (r.error) {
                  setDone(false);
                  setError(r.error);
                }
              })
            }
            className="mt-3 w-full rounded-full bg-lime py-3 font-extrabold text-foreground disabled:opacity-70"
          >
            Join the Premium waitlist, {formatMoney(priceCents, { showCents: true })}/month
          </button>
          {error && <p className="mt-2 text-sm">{error}</p>}
        </>
      )}
    </div>
  );
}
