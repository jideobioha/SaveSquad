// Streak rules (see README → Key rules):
// - Weeks run Monday–Sunday (UTC for now).
// - A week is "on time" when your saves that week reach your weekly target.
// - Your streak is your run of consecutive on-time weeks. The current week
//   doesn't break it until it's over, so you have all week to save.

const DAY_MS = 86_400_000;

// Monday-based week number. 1970-01-01 was a Thursday, hence the +3.
export function weekIndex(date: Date) {
  return Math.floor((Math.floor(date.getTime() / DAY_MS) + 3) / 7);
}

type Save = { amount_cents: number; created_at: string };

function totalsByWeek(saves: Save[]) {
  const totals = new Map<number, number>();
  for (const s of saves) {
    const w = weekIndex(new Date(s.created_at));
    totals.set(w, (totals.get(w) ?? 0) + s.amount_cents);
  }
  return totals;
}

// Counts consecutive on-time weeks going back from `fromWeek`.
function runEndingAt(fromWeek: number, totals: Map<number, number>, target: number) {
  let n = 0;
  while ((totals.get(fromWeek - n) ?? 0) >= target) n++;
  return n;
}

export function streakStats(saves: Save[], weeklyTargetCents: number, now: Date) {
  const totals = totalsByWeek(saves);
  const thisWeek = weekIndex(now);
  const thisWeekCents = totals.get(thisWeek) ?? 0;
  const metThisWeek = thisWeekCents >= weeklyTargetCents;

  const current = runEndingAt(metThisWeek ? thisWeek : thisWeek - 1, totals, weeklyTargetCents);

  let best = 0;
  for (const w of totals.keys()) {
    best = Math.max(best, runEndingAt(w, totals, weeklyTargetCents));
  }

  return { current, best, thisWeekCents, metThisWeek };
}

export type FeedSave = Save & { id: string; user_id: string };

export type FeedEvent =
  | { kind: "save"; id: string; userId: string; amountCents: number; at: string }
  | { kind: "streak"; id: string; userId: string; weeks: number; at: string };

// Turns a squad's saves into activity: every chip-in, plus a
// "hit an N-week streak" moment when a save completes a week that extends
// a streak to 2+ weeks. Newest first.
export function buildFeed(saves: FeedSave[], targets: Map<string, number>, limit = 20) {
  const sorted = [...saves].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const totals = new Map<string, Map<number, number>>(); // user → week → cents
  const events: FeedEvent[] = [];

  for (const s of sorted) {
    events.push({ kind: "save", id: s.id, userId: s.user_id, amountCents: s.amount_cents, at: s.created_at });

    const target = targets.get(s.user_id);
    if (!target) continue; // left the squad
    const userTotals = totals.get(s.user_id) ?? new Map<number, number>();
    totals.set(s.user_id, userTotals);

    const w = weekIndex(new Date(s.created_at));
    const before = userTotals.get(w) ?? 0;
    const after = before + s.amount_cents;
    userTotals.set(w, after);

    if (before < target && after >= target) {
      const weeks = runEndingAt(w, userTotals, target);
      if (weeks >= 2) {
        events.push({ kind: "streak", id: `${s.id}-streak`, userId: s.user_id, weeks, at: s.created_at });
      }
    }
  }

  return events.reverse().slice(0, limit);
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
