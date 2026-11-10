// What public.record_save returns.
export type SaveRow = {
  save_id: string;
  xp_gained: number;
  week_completed: boolean;
  earned_freeze: boolean;
  new_badges: string[];
};

// Link to the celebration screen for a save.
export function winUrl(row: SaveRow) {
  const q = new URLSearchParams({ save: row.save_id, xp: String(row.xp_gained) });
  if (row.new_badges?.length) q.set("badges", row.new_badges.join(","));
  if (row.earned_freeze) q.set("freeze", "1");
  return `/win?${q}`;
}
