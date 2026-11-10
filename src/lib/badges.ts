// Badge ids must match public.check_badges in
// supabase/migrations/0003_rewards_and_trust.sql.
export const BADGES = [
  { id: "first_save", emoji: "🌱", name: "First Save", how: "Log your first save" },
  { id: "first_100", emoji: "💯", name: "First $100", how: "Save $100 in total" },
  { id: "squad_starter", emoji: "👥", name: "Squad Starter", how: "Start a squad goal" },
  { id: "on_a_roll", emoji: "🔥", name: "On a Roll", how: "Hit a 4-week streak" },
  { id: "quarter_streaker", emoji: "🏅", name: "Quarter Streaker", how: "13 straight weeks of saving" },
  { id: "lucky_spinner", emoji: "🎡", name: "Lucky Spinner", how: "Save 7 daily spins" },
  { id: "team_player", emoji: "👏", name: "Team Player", how: "Cheer 5 squad saves" },
  { id: "goal_getter", emoji: "🎯", name: "Goal Getter", how: "Reach your personal goal" },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

export function badgeById(id: string) {
  return BADGES.find((b) => b.id === id);
}
