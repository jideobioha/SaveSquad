"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-4xl">📬</p>
        <h2 className="mt-3 text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <strong>{state.message}</strong>. Open it on
          this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-semibold">Your first name</span>
        <input
          name="name"
          autoComplete="given-name"
          placeholder="Jenny"
          className="mt-1 w-full rounded-2xl border border-black/10 bg-card px-4 py-3 outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          className="mt-1 w-full rounded-2xl border border-black/10 bg-card px-4 py-3 outline-none focus:border-brand"
        />
      </label>
      {state.status === "error" && (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
