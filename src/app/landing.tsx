import Link from "next/link";

export function Landing() {
  return (
    <main className="flex flex-1 flex-col justify-between bg-brand px-6 py-12 text-white">
      <div className="mt-16">
        <h1 className="text-5xl font-extrabold tracking-tight">SaveSquad</h1>
        <p className="mt-3 text-2xl font-bold text-lime">
          Save solo. Win together.
        </p>
        <p className="mt-6 text-base text-white/80">
          Your streaks and challenges power your squad&apos;s shared goals.
        </p>
        <ul className="mt-8 space-y-3 text-sm font-semibold">
          <li className="rounded-full bg-lime px-4 py-2 text-foreground">
            Streaks, levels and daily challenges
          </li>
          <li className="rounded-full bg-white px-4 py-2 text-foreground">
            Shared squad goals with friends
          </li>
          <li className="rounded-full bg-white px-4 py-2 text-foreground">
            Leagues ranked by consistency
          </li>
        </ul>
      </div>
      <div>
        <Link
          href="/login"
          className="block w-full rounded-full bg-lime py-3.5 text-center font-bold text-foreground"
        >
          Get started
        </Link>
        <p className="mt-4 text-center text-xs text-white/60">
          Proof of concept · Team 317
        </p>
      </div>
    </main>
  );
}
