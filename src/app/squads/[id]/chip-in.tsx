"use client";

import { useActionState, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { chipIn, type ChipInState } from "./actions";

const QUICK = [5, 10, 20, 50];

export function ChipIn({ squadId }: { squadId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState<ChipInState, FormData>(
    chipIn.bind(null, squadId),
    { status: "idle" },
  );

  // Close the sheet after each successful save.
  useEffect(() => {
    if (state.status === "done") {
      setOpen(false);
      setAmount("");
    }
  }, [state.at, state.status]);

  return (
    <>
      {state.status === "done" && !open && (
        <p className="mb-2 text-center text-sm font-semibold text-brand">
          🎉 You chipped in {formatMoney(Number(state.message), { showCents: true })}
        </p>
      )}
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-brand py-3.5 font-bold text-white transition hover:bg-brand-dark"
      >
        Chip in
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-10"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-black/15" />
            <h2 className="text-xl font-bold">How much did you save?</h2>
            <p className="mt-1 text-sm text-muted">
              Self-reported. Move the money yourself, then log it here.
            </p>

            <div className="mt-5 flex items-center rounded-2xl bg-card px-4 py-3 text-3xl font-extrabold">
              <span className="text-muted">$</span>
              <input
                name="amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent pl-1 outline-none"
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-full bg-card py-2 text-sm font-bold"
                >
                  ${q}
                </button>
              ))}
            </div>

            {state.status === "error" && (
              <p className="mt-3 text-sm font-medium text-red-600">{state.message}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add to the squad"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
