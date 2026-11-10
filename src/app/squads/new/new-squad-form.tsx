"use client";

import { useActionState, useState } from "react";
import { createSquad, type CreateSquadState } from "./actions";

const MODES = [
  { value: "anytime", label: "Chip in anytime" },
  { value: "equal_split", label: "Equal split" },
  { value: "weekly_auto", label: "Weekly auto" },
];

const RULES = [
  {
    name: "withdrawals_need_vote",
    label: "Withdrawals need a vote",
    hint: "Majority must approve",
    defaultOn: true,
  },
  {
    name: "show_amounts",
    label: "Show individual amounts",
    hint: "Off = only the total is shown",
    defaultOn: false,
  },
  {
    name: "join_league",
    label: "Join the Squad League",
    hint: "Compete on consistency",
    defaultOn: true,
  },
];

const field =
  "mt-1 w-full rounded-2xl border border-black/10 bg-card px-4 py-3 outline-none focus:border-brand";

export function NewSquadForm() {
  const [state, action, pending] = useActionState<CreateSquadState, FormData>(
    createSquad,
    {},
  );
  const [mode, setMode] = useState("anytime");

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold">Goal name</span>
        <input name="name" required maxLength={60} placeholder="Europe Summer '27" className={field} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Target</span>
          <input name="target" required inputMode="decimal" placeholder="$8,000" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Deadline</span>
          <input name="deadline" type="date" required className={field} />
        </label>
      </div>


      <fieldset>
        <legend className="text-sm font-semibold">How do we contribute?</legend>
        <input type="hidden" name="mode" value={mode} />
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === m.value ? "bg-brand text-white" : "bg-card text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-3xl bg-card p-2">
        <legend className="mb-2 text-sm font-semibold">Squad rules</legend>
        {RULES.map((r) => (
          <label key={r.name} className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <span className="flex-1">
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </span>
            <input
              type="checkbox"
              name={r.name}
              defaultChecked={r.defaultOn}
              className="peer sr-only"
            />
            <span className="relative h-7 w-12 rounded-full bg-black/15 transition peer-checked:bg-brand after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          </label>
        ))}
      </fieldset>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create squad & invite"}
      </button>
    </form>
  );
}
