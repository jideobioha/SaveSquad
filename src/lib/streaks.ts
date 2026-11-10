// Streak counts come from the database (public.user_streaks), so they're the
// same everywhere. This file only has display helpers.

const DAY_MS = 86_400_000;

// Monday-based week number (UTC). 1970-01-01 was a Thursday, hence the +3.
export function weekIndex(date: Date) {
  return Math.floor((Math.floor(date.getTime() / DAY_MS) + 3) / 7);
}

// Your last `count` weeks, oldest first, for the row of streak dots.
export function recentWeeks(
  saves: { amount_cents: number; created_at: string }[],
  weeklyTargetCents: number,
  now: Date,
  count = 8,
) {
  const totals = new Map<number, number>();
  for (const s of saves) {
    const w = weekIndex(new Date(s.created_at));
    totals.set(w, (totals.get(w) ?? 0) + s.amount_cents);
  }
  const thisWeek = weekIndex(now);
  return Array.from({ length: count }, (_, i) => {
    const w = thisWeek - (count - 1 - i);
    return { week: w, met: (totals.get(w) ?? 0) >= weeklyTargetCents, isCurrent: w === thisWeek };
  });
}

export function timeAgo(iso: string, now: Date) {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Days left until Sunday 23:59 UTC, when this week's streak window closes.
export function daysLeftInWeek(now: Date) {
  const dow = (now.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return 6 - dow;
}
