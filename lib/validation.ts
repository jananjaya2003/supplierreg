import { STATUSES, type RegistrationInput } from "./types";

export type FormErrors = Partial<Record<keyof RegistrationInput, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: string) {
  if (!DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y >= 2000 && y <= 2100;
}

function money(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Registration fee = units × unit price, rounded to cents (same as the DB trigger). */
export function calcFee(units: number, unitPrice: number): number {
  return Math.round(units * Math.round(unitPrice * 100)) / 100;
}

/** Live preview for forms: parses raw input, returns null if either value isn't a number yet. */
export function previewFee(units: unknown, unitPrice: unknown): number | null {
  const u = money(units === "" || units === undefined ? 1 : units), p = money(unitPrice);
  return u === null || p === null ? null : calcFee(u, p);
}

/**
 * Validates and normalises raw form values. Mirrors the CHECK constraints in
 * supabase/schema.sql so users see friendly messages instead of Postgres errors.
 */
export function validateRegistration(raw: Record<string, unknown>): {
  data: RegistrationInput | null;
  errors: FormErrors;
} {
  const errors: FormErrors = {};
  const str = (k: string) => String(raw[k] ?? "").trim();
  const optStr = (k: string) => str(k) || null;

  const institute = str("institute");
  if (!institute) errors.institute = "Institute is required.";
  else if (institute.length > 120) errors.institute = "Keep it under 120 characters.";

  const dateFields = ["payments_closing_date", "applications_closing_date", "application_sent_date"] as const;
  const dates: Record<string, string | null> = {};
  for (const f of dateFields) {
    const v = str(f);
    if (v && !isValidDate(v)) errors[f] = "Enter a valid date.";
    dates[f] = v || null;
  }

  // No cross-field date ordering rule: real data has payments closing after
  // applications, so the deadlines are independent.

  const units = money(raw.units === undefined || raw.units === "" ? 1 : raw.units);
  if (units === null || !Number.isInteger(units)) errors.units = "Enter a whole number.";
  else if (units < 0) errors.units = "Can't be negative.";
  else if (units > 1_000_000) errors.units = "Too many units.";

  const price = money(raw.unit_price);
  if (price === null) errors.unit_price = "Enter a number.";
  else if (price < 0) errors.unit_price = "Can't be negative.";
  else if (price > 9_999_999_999) errors.unit_price = "Amount is too large.";

  const fee = units !== null && price !== null ? calcFee(units, price) : 0;
  if (!errors.units && !errors.unit_price && fee > 9_999_999_999) errors.units = "Units × unit price is too large.";

  const other = money(raw.other_charges);
  if (other === null) errors.other_charges = "Enter a number.";
  else if (other < 0) errors.other_charges = "Can't be negative.";
  else if (other > 9_999_999_999) errors.other_charges = "Amount is too large.";

  const status = str("status") || "Pending";
  if (!(STATUSES as readonly string[]).includes(status)) errors.status = "Pick a status.";

  const remarks = optStr("remarks");
  if (remarks && remarks.length > 1000) errors.remarks = "Keep remarks under 1000 characters.";

  for (const f of ["application_mode", "method_of_payment"] as const) {
    const v = str(f);
    if (v.length > 80) errors[f] = "Keep it under 80 characters.";
  }

  if (Object.keys(errors).length) return { data: null, errors };

  return {
    errors,
    data: {
      institute,
      payments_closing_date: dates.payments_closing_date,
      applications_closing_date: dates.applications_closing_date,
      application_sent_date: dates.application_sent_date,
      application_mode: optStr("application_mode"),
      method_of_payment: optStr("method_of_payment"),
      units: units!,
      unit_price: Math.round(price! * 100) / 100,
      registration_fee: fee,
      other_charges: Math.round(other! * 100) / 100,
      remarks,
      status: status as RegistrationInput["status"],
    },
  };
}
