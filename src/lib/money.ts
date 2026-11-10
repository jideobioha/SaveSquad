// All amounts are stored as integer cents to avoid floating-point errors.

export function formatMoney(cents: number, opts: { showCents?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.showCents ? 2 : 0,
    maximumFractionDigits: opts.showCents ? 2 : 0,
  }).format(cents / 100);
}

// Parses user input like "12", "12.50" or "$1,200" into cents. Returns null if invalid.
export function parseDollarsToCents(input: FormDataEntryValue | null) {
  const cleaned = String(input ?? "").replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}
