const lkr = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const formatMoney = (n: number | null | undefined) => lkr.format(Number(n ?? 0));
export const formatCompact = (n: number) => compact.format(n);

/** "2025-03-14" → "14 Mar 2025". Parsed as a calendar date, not a UTC instant, so it never shifts a day. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const total = (r: { registration_fee: number; other_charges: number }) =>
  Number(r.registration_fee ?? 0) + Number(r.other_charges ?? 0);
