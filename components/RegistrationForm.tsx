"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { STATUSES, type Registration, type RegistrationInput } from "@/lib/types";
import { previewFee, validateRegistration, type FormErrors } from "@/lib/validation";
import { formatMoney } from "@/lib/format";

/** Text inputs use list="dl-institutes" / "dl-modes" / "dl-payments", rendered once by the page. */
interface Props {
  initial?: Registration | null;
  onSubmit: (data: RegistrationInput) => Promise<void>;
  onCancel: () => void;
}

const EMPTY = {
  institute: "",
  payments_closing_date: "",
  applications_closing_date: "",
  application_mode: "",
  method_of_payment: "",
  units: "1",
  unit_price: "",
  other_charges: "",
  application_sent_date: "",
  remarks: "",
  status: "Pending",
};

type Values = typeof EMPTY;

function toValues(r?: Registration | null): Values {
  if (!r) return EMPTY;
  return {
    institute: r.institute,
    payments_closing_date: r.payments_closing_date ?? "",
    applications_closing_date: r.applications_closing_date ?? "",
    application_mode: r.application_mode ?? "",
    method_of_payment: r.method_of_payment ?? "",
    units: String(r.units ?? 1),
    unit_price: String(r.unit_price ?? ""),
    other_charges: String(r.other_charges ?? ""),
    application_sent_date: r.application_sent_date ?? "",
    remarks: r.remarks ?? "",
    status: r.status,
  };
}

function Field({
  label, error, children, className = "", required,
}: { label: string; error?: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400" role="alert">{error}</span>}
    </label>
  );
}

export default function RegistrationForm({ initial, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    // After the first submit attempt, re-validate as the user types so errors clear immediately.
    if (touched) setErrors(validateRegistration(next).errors);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const { data, errors } = validateRegistration(values);
    setErrors(errors);
    if (!data) return;
    setSaving(true);
    try {
      await onSubmit(data);
    } finally {
      setSaving(false);
    }
  }

  const cls = (k: keyof FormErrors) => `input ${errors[k] ? "input-error" : ""}`;
  const fee = previewFee(values.units, values.unit_price);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
        <Field label="Institute" error={errors.institute} required className="sm:col-span-2">
          <input className={cls("institute")} value={values.institute} onChange={set("institute")} list="dl-institutes" placeholder="e.g. Kandy" maxLength={120} />
        </Field>

        <Field label="Payments closing date" error={errors.payments_closing_date}>
          <input type="date" className={cls("payments_closing_date")} value={values.payments_closing_date} onChange={set("payments_closing_date")} />
        </Field>
        <Field label="Applications closing date" error={errors.applications_closing_date}>
          <input type="date" className={cls("applications_closing_date")} value={values.applications_closing_date} onChange={set("applications_closing_date")} />
        </Field>

        <Field label="Application mode" error={errors.application_mode}>
          <input className={cls("application_mode")} value={values.application_mode} onChange={set("application_mode")} list="dl-modes" placeholder="e.g. Hospital" maxLength={80} />
        </Field>
        <Field label="Method of payment" error={errors.method_of_payment}>
          <input className={cls("method_of_payment")} value={values.method_of_payment} onChange={set("method_of_payment")} list="dl-payments" placeholder="e.g. People's Bank" maxLength={80} />
        </Field>

        <Field label="Units" error={errors.units}>
          <input inputMode="numeric" className={cls("units")} value={values.units} onChange={set("units")} placeholder="1" />
        </Field>
        <Field label="Unit price (LKR)" error={errors.unit_price}>
          <input inputMode="decimal" className={cls("unit_price")} value={values.unit_price} onChange={set("unit_price")} placeholder="0.00" />
        </Field>

        <Field label="Registration fee (LKR) = units × unit price">
          <output className="input block bg-slate-50 tabular-nums text-slate-700 dark:bg-slate-800/60 dark:text-slate-200" aria-live="polite">
            {fee === null ? "—" : formatMoney(fee)}
          </output>
        </Field>
        <Field label="Other charges (LKR)" error={errors.other_charges}>
          <input inputMode="decimal" className={cls("other_charges")} value={values.other_charges} onChange={set("other_charges")} placeholder="0.00" />
        </Field>

        <Field label="Application sent date" error={errors.application_sent_date}>
          <input type="date" className={cls("application_sent_date")} value={values.application_sent_date} onChange={set("application_sent_date")} />
        </Field>
        <Field label="Status" error={errors.status} required>
          <select className={cls("status")} value={values.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Remarks" error={errors.remarks} className="sm:col-span-2">
          <textarea className={`${cls("remarks")} min-h-[80px] resize-y`} value={values.remarks} onChange={set("remarks")} maxLength={1000} placeholder="Optional notes" />
        </Field>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white/90 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Save changes" : "Create record"}
        </button>
      </div>
    </form>
  );
}
