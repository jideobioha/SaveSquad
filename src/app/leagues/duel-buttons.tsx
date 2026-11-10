"use client";

import { useActionState, useState, useTransition } from "react";
import { checkInDuel, createDuel, markDuelPaid, respondDuel, type DuelFormState } from "./actions";

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
    });
  return { error, pending, run };
}

export function RespondButtons({ duelId }: { duelId: string }) {
  const { error, pending, run } = useAction();
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => respondDuel(duelId, true))}
          className="flex-1 rounded-full bg-lime py-2 text-sm font-bold text-foreground"
        >
          Accept
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => respondDuel(duelId, false))}
          className="flex-1 rounded-full bg-white/15 py-2 text-sm font-bold"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function CheckInButton({ duelId, checkedToday }: { duelId: string; checkedToday: boolean }) {
  const { error, pending, run } = useAction();
  return (
    <div className="mt-3">
      <button
        disabled={pending || checkedToday}
        onClick={() => run(() => checkInDuel(duelId))}
        className="w-full rounded-full bg-lime py-2.5 text-sm font-bold text-foreground disabled:bg-white/15 disabled:text-white"
      >
        {checkedToday ? "✓ Checked in today" : pending ? "Checking in…" : "I kept it today ✓"}
      </button>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function PaidButton({ duelId }: { duelId: string }) {
  const { error, pending, run } = useAction();
  return (
    <div className="mt-3">
      <button
        disabled={pending}
        onClick={() => run(() => markDuelPaid(duelId))}
        className="w-full rounded-full bg-brand py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        Mark the stake as paid
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const PRESETS = ["No-delivery week", "Pack lunch every day", "No impulse buys", "Coffee at home"];
const STAKES = [0, 5, 10];

export function NewDuel({ friends }: { friends: { id: string; name: string; color: string }[] }) {
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState(friends[0]?.id ?? "");
  const [challenge, setChallenge] = useState(PRESETS[0]);
  const [stake, setStake] = useState(5);
  const [state, action, pending] = useActionState<DuelFormState, FormData>(
    async (prev, formData) => {
      const r = await createDuel(prev, formData);
      if (r.done) setOpen(false);
      return r;
    },
    {},
  );

  if (friends.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted">
        Join or start a squad to duel your friends.
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-brand py-3.5 font-bold text-white"
      >
        ⚔️ Challenge a friend
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-black/15" />
            <h2 className="text-xl font-bold">New friend duel</h2>
            <p className="mt-1 text-sm text-muted">
              One week. Check in each day you keep it. Most days by Sunday wins.
            </p>

            <p className="mt-5 text-sm font-semibold">Who?</p>
            <input type="hidden" name="opponent" value={opponent} />
            <div className="mt-2 flex flex-wrap gap-2">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOpponent(f.id)}
                  className={`flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold ${
                    opponent === f.id ? "bg-brand text-white" : "bg-card"
                  }`}
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: f.color }}
                  >
                    {f.name.slice(0, 2).toUpperCase()}
                  </span>
                  {f.name}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-semibold">The challenge</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChallenge(p)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    challenge === p ? "bg-brand text-white" : "bg-card"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              name="challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              maxLength={60}
              className="mt-2 w-full rounded-2xl bg-card px-4 py-3 outline-none"
            />

            <p className="mt-5 text-sm font-semibold">Loser funds the winner&apos;s goal</p>
            <input type="hidden" name="stake" value={stake} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStake(s)}
                  className={`rounded-full py-2 text-sm font-bold ${
                    stake === s ? "bg-brand text-white" : "bg-card"
                  }`}
                >
                  {s === 0 ? "Just for fun" : `$${s}`}
                </button>
              ))}
            </div>

            {state.error && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send challenge"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
