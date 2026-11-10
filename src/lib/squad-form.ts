import { parseDollarsToCents } from "@/lib/money";

export const CONTRIBUTION_MODES = ["anytime", "equal_split", "weekly_auto"] as const;

export type SquadFields = {
  name: string;
  target_cents: number;
  deadline: string;
  contribution_mode: (typeof CONTRIBUTION_MODES)[number];
  withdrawals_need_vote: boolean;
  show_amounts: boolean;
  join_league: boolean;
};

// Validates the squad form (create and settings share it).
export function parseSquadForm(formData: FormData): { fields: SquadFields } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const targetCents = parseDollarsToCents(formData.get("target"));
  const deadline = String(formData.get("deadline") ?? "");
  const mode = String(formData.get("mode") ?? "anytime");

  if (!name || name.length > 60) return { error: "Give your goal a name (up to 60 characters)." };
  if (!targetCents) return { error: "Enter a target amount, like 8000." };
  if (!deadline || new Date(deadline) <= new Date()) return { error: "Pick a deadline in the future." };
  if (!CONTRIBUTION_MODES.includes(mode as SquadFields["contribution_mode"])) {
    return { error: "Pick how you'll contribute." };
  }

  return {
    fields: {
      name,
      target_cents: targetCents,
      deadline,
      contribution_mode: mode as SquadFields["contribution_mode"],
      withdrawals_need_vote: formData.get("withdrawals_need_vote") === "on",
      show_amounts: formData.get("show_amounts") === "on",
      join_league: formData.get("join_league") === "on",
    },
  };
}
