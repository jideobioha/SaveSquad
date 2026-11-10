"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { requestWithdrawal, voteWithdrawal, type WithdrawState } from "./actions";

export function WithdrawButton({ squadId, needsVote }: { squadId: string; needsVote: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<WithdrawState, FormData>(
    async (prev, formData) => {
      const result = await requestWithdrawal(squadId, prev, formData);
      if (result.status === "done") setOpen(false);
      return result;
    },
    { status: "idle" },
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-brand">
        Request a withdrawal
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-10"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-black/15" />
            <h2 className="text-xl font-bold">Take money out</h2>
            <p className="mt-1 text-sm text-muted">
              {needsVote
                ? "Your squad votes on this. It goes through once a majority approves."
                : "This squad doesn't require a vote, so it goes through right away."}
            </p>
            <div className="mt-5 flex items-center rounded-2xl bg-card px-4 py-3 text-3xl font-extrabold">
              <span className="text-muted">$</span>
              <input
                name="amount"
                inputMode="decimal"
                autoFocus
                placeholder="0"
                className="w-full bg-transparent pl-1 outline-none"
              />
            </div>
            <input
              name="reason"
              maxLength={140}
              placeholder="What's it for? e.g. Flight deposit"
              className="mt-3 w-full rounded-2xl bg-card px-4 py-3 outline-none"
            />
            {state.status === "error" && (
              <p className="mt-3 text-sm font-medium text-red-600">{state.message}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-full bg-foreground py-3.5 font-bold text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : needsVote ? "Ask the squad" : "Withdraw"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function VoteButtons({
  squadId,
  withdrawalId,
  myVote,
}: {
  squadId: string;
  withdrawalId: string;
  myVote: boolean | null;
}) {
  const [vote, setVote] = useOptimistic(myVote);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const cast = (approve: boolean) =>
    start(async () => {
      setVote(approve);
      const r = await voteWithdrawal(squadId, withdrawalId, approve);
      setError(r.error ?? null);
    });

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          onClick={() => cast(true)}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${
            vote === true ? "bg-brand text-white" : "bg-brand/10 text-brand"
          }`}
        >
          {vote === true ? "✓ Approved" : "Approve"}
        </button>
        <button
          onClick={() => cast(false)}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${
            vote === false ? "bg-foreground text-white" : "bg-black/5"
          }`}
        >
          {vote === false ? "✗ Rejected" : "Reject"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
