"use client";

import { useActionState, useState } from "react";
import { startStreak, type OnboardingState } from "./actions";

const KINDS = [
  { value: "trip", label: "Trip", emoji: "✈️", example: "Tokyo Trip" },
  { value: "emergency", label: "Emergency fund", emoji: "🛟", example: "Rainy-day fund" },
  { value: "down_payment", label: "Down payment", emoji: "🏠", example: "First apartment" },
  { value: "other", label: "Something else", emoji: "✨", example: "New laptop" },
];

const field =
  "mt-1 w-full rounded-2xl border border-black/10 bg-card px-4 py-3 outline-none focus:border-brand";

// Weekly amount that reaches the target by the deadline.
function suggestWeekly(target: string, deadline: string) {
  const t = Number(target.replace(/[$,\s]/g, ""));
  const ms = new Date(deadline + "T00:00:00").getTime() - Date.now();
  if (!t || !(ms > 0)) return null;
  const weeks = Math.max(1, Math.ceil(ms / (7 * 86_400_000)));
  return Math.ceil(t / weeks);
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(startStreak, {});
  const [kind, setKind] = useState("trip");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [weekly, setWeekly] = useState("");
  const [weeklyTouched, setWeeklyTouched] = useState(false);

  // Keep the weekly suggestion in step with target and date until the user edits it.
  function update(nextTarget: string, nextDeadline: string) {
    setTarget(nextTarget);
    setDeadline(nextDeadline);
    if (!weeklyTouched) {
      const s = suggestWeekly(nextTarget, nextDeadline);
      setWeekly(s ? String(s) : "");
    }
  }

  const example = KINDS.find((k) => k.value === kind)?.example;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-3">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-3xl border-2 p-4 text-left transition ${
              kind === k.value ? "border-brand bg-brand/5" : "border-transparent bg-card"
            }`}
          >
            <span className="text-2xl">{k.emoji}</span>
            <span className="mt-2 block font-bold">{k.label}</span>
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm font-semibold">Name it</span>
        <input name="name" required maxLength={60} placeholder={example} className={field} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Target</span>
          <input
            name="target"
            required
            inputMode="decimal"
            placeholder="$2,000"
            value={target}
            onChange={(e) => update(e.target.value, deadline)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">By</span>
          <input
            name="deadline"
            type="date"
            required
            value={deadline}
            onChange={(e) => update(target, e.target.value)}
            className={field}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">Each week, I&apos;ll save</span>
        <div className="mt-1 flex items-center rounded-2xl border border-black/10 bg-card px-4 py-3 focus-within:border-brand">
          <span className="text-muted">$</span>
          <input
            name="weekly"
            required
            inputMode="decimal"
            value={weekly}
            onChange={(e) => {
              setWeekly(e.target.value);
              setWeeklyTouched(true);
            }}
            placeholder="25"
            className="w-full bg-transparent pl-1 outline-none"
          />
          <span className="text-sm text-muted">/ week</span>
        </div>
        <span className="mt-1 block text-xs text-muted">
          {weeklyTouched ? "Hit this each week to grow your streak." : "Suggested from your target and date. Change it anytime."}
        </span>
      </label>

      <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
        <span className="text-xl">🛡️</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">You stay in control</span>
          <span className="block text-xs text-muted">
            Nothing moves without your tap. You log every save yourself.
          </span>
        </span>
      </div>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start my streak"}
      </button>
    </form>
  );
}
