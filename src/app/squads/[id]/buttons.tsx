"use client";

import { useOptimistic, useTransition } from "react";
import { nudge, setHideAmount, toggleCheer } from "./actions";

export function CheerButton({
  squadId,
  saveId,
  count,
  cheered,
  disabled,
}: {
  squadId: string;
  saveId: string;
  count: number;
  cheered: boolean;
  disabled?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic({ count, cheered });
  const [, start] = useTransition();

  return (
    <button
      disabled={disabled}
      onClick={() =>
        start(async () => {
          setOptimistic({
            cheered: !optimistic.cheered,
            count: optimistic.count + (optimistic.cheered ? -1 : 1),
          });
          await toggleCheer(squadId, saveId, optimistic.cheered);
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
        optimistic.cheered ? "bg-brand text-white" : "bg-brand/10 text-brand"
      } disabled:bg-transparent disabled:text-muted`}
    >
      👏 {optimistic.count > 0 ? optimistic.count : disabled ? "" : "Cheer"}
    </button>
  );
}

export function NudgeButton({
  squadId,
  targetUserId,
  alreadyNudged,
}: {
  squadId: string;
  targetUserId: string;
  alreadyNudged: boolean;
}) {
  const [done, setDone] = useOptimistic(alreadyNudged);
  const [, start] = useTransition();

  return (
    <button
      disabled={done}
      onClick={() =>
        start(async () => {
          setDone(true);
          await nudge(squadId, targetUserId);
        })
      }
      className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold disabled:text-muted"
      title="Give a friendly reminder to save this week"
    >
      {done ? "Nudged" : "👋 Nudge"}
    </button>
  );
}

export function HideAmountToggle({ squadId, hidden }: { squadId: string; hidden: boolean }) {
  const [value, setValue] = useOptimistic(hidden);
  const [, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          setValue(!value);
          await setHideAmount(squadId, !value);
        })
      }
      className="text-sm font-semibold text-brand"
    >
      {value ? "Show my amount" : "Hide my amount"}
    </button>
  );
}
