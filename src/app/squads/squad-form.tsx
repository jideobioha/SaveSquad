"use client";

import { useActionState, useState } from "react";
import type { SquadFields } from "@/lib/squad-form";

export type SquadFormState = { error?: string };

const MODES = [
  { value: "anytime", label: "Chip in anytime", hint: "Any amount, whenever you like." },
  { value: "equal_split", label: "Equal split", hint: "Everyone aims for the same share of the target." },
  { value: "weekly_auto", label: "Weekly", hint: "A weekly amount each, worked out from what's left and the deadline." },
];

const RULES = [
  { name: "withdrawals_need_vote", label: "Withdrawals need a vote", hint: "Majority must approve" },
  { name: "show_amounts", label: "Show individual amounts", hint: "Off = only the total is shown" },
  { name: "join_league", label: "Join the Squad League", hint: "Compete on consistency" },
] as const;

const NEW_SQUAD_DEFAULTS: Partial<SquadFields> = {
  contribution_mode: "anytime",
  withdrawals_need_vote: true,
  show_amounts: false,
  join_league: true,
};

const field =
  "mt-1 w-full rounded-2xl border border-black/10 bg-card px-4 py-3 outline-none focus:border-brand";

export function SquadForm({
  action: serverAction,
  defaults = NEW_SQUAD_DEFAULTS,
  submitLabel,
  pendingLabel,
}: {
  action: (prev: SquadFormState, formData: FormData) => Promise<SquadFormState>;
  defaults?: Partial<SquadFields>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, action, pending] = useActionState(serverAction, {});
  const [mode, setMode] = useState<string>(defaults.contribution_mode ?? "anytime");

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold">Goal name</span>
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={defaults.name}
          placeholder="Europe Summer '27"
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Target</span>
          <input
            name="target"
            required
            inputMode="decimal"
            defaultValue={defaults.target_cents ? defaults.target_cents / 100 : undefined}
            placeholder="$8,000"
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Deadline</span>
          <input name="deadline" type="date" required defaultValue={defaults.deadline} className={field} />
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
        <p className="mt-2 text-xs text-muted">{MODES.find((m) => m.value === mode)?.hint}</p>
      </fieldset>

      <fieldset className="rounded-3xl bg-card p-2">
        <legend className="mb-2 text-sm font-semibold">Squad rules</legend>
        {RULES.map((r) => (
          <label key={r.name} className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <span className="flex-1">
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </span>
            <input type="checkbox" name={r.name} defaultChecked={defaults[r.name]} className="peer sr-only" />
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
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
