// Must match record_save in supabase/migrations/0002_core_loop.sql.
export const XP_PER_LEVEL = 250;

export function levelProgress(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, toNext: XP_PER_LEVEL - into, pct: (into / XP_PER_LEVEL) * 100 };
}

const TITLES = ["Starter", "Saver", "Saver", "Steady Saver", "Streaker", "Squad Star", "Money Mover"];

export function levelTitle(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1] ?? "Legend";
}
