"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2, Maximize2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { STATUSES, type Registration, type RegistrationInput } from "@/lib/types";
import { validateRegistration, type FormErrors } from "@/lib/validation";

export type SortKey =
  | "no" | "institute" | "payments_closing_date" | "applications_closing_date"
  | "registration_fee" | "other_charges" | "application_sent_date" | "status";
export type SortState = { key: SortKey; dir: "asc" | "desc" };

interface Props {
  rows: Registration[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  flashIds: Set<string>;
  onOpenEdit: (row: Registration) => void;
  onDelete: (row: Registration) => void;
  onInlineSave: (id: string, data: RegistrationInput) => Promise<void>;
}

type Draft = Record<keyof RegistrationInput, string>;

function toDraft(r: Registration): Draft {
  return {
    institute: r.institute,
    payments_closing_date: r.payments_closing_date ?? "",
    applications_closing_date: r.applications_closing_date ?? "",
    application_mode: r.application_mode ?? "",
    method_of_payment: r.method_of_payment ?? "",
    registration_fee: String(r.registration_fee),
    other_charges: String(r.other_charges),
    application_sent_date: r.application_sent_date ?? "",
    remarks: r.remarks ?? "",
    status: r.status,
  };
}

const HEADERS: { key?: SortKey; label: string; align?: "right" }[] = [
  { key: "no", label: "No" },
  { key: "institute", label: "Institute" },
  { key: "payments_closing_date", label: "Payment closes" },
  { key: "applications_closing_date", label: "Application closes" },
  { label: "Mode" },
  { label: "Payment method" },
  { key: "registration_fee", label: "Reg. fee", align: "right" },
  { key: "other_charges", label: "Other", align: "right" },
  { key: "application_sent_date", label: "Sent" },
  { key: "status", label: "Status" },
  { label: "Remarks" },
];

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

const cellInput = "input !px-2 !py-1 text-xs";

export default function RegistrationTable({ rows, sort, onSort, flashIds, onOpenEdit, onDelete, onInlineSave }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  function startEdit(r: Registration) {
    setEditingId(r.id);
    setDraft(toDraft(r));
    setErrors({});
  }
  function cancel() {
    setEditingId(null);
    setDraft(null);
    setErrors({});
  }
  async function save() {
    if (!editingId || !draft) return;
    const { data, errors } = validateRegistration(draft);
    setErrors(errors);
    if (!data) {
      toast.error("Fix the highlighted fields", { description: Object.values(errors)[0] });
      return;
    }
    setSaving(true);
    try {
      await onInlineSave(editingId, data);
      cancel();
    } catch {
      // Parent already toasted the error; stay in edit mode so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  const bind = (k: keyof Draft) => ({
    value: draft?.[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => (d ? { ...d, [k]: e.target.value } : d)),
    className: `${cellInput} ${errors[k] ? "input-error" : ""}`,
    "aria-invalid": Boolean(errors[k]),
    title: errors[k],
  });

  const actions = (r: Registration, editing: boolean) =>
    editing ? (
      <div className="flex justify-end gap-1">
        <button className="icon-btn text-emerald-600" onClick={save} disabled={saving} aria-label="Save row" title="Save (Enter)">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button className="icon-btn" onClick={cancel} disabled={saving} aria-label="Cancel editing" title="Cancel (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex justify-end gap-1">
        <button className="icon-btn" onClick={() => startEdit(r)} aria-label={`Edit row ${r.no} inline`} title="Edit inline">
          <Pencil className="h-4 w-4" />
        </button>
        <button className="icon-btn" onClick={() => onOpenEdit(r)} aria-label={`Open row ${r.no} in form`} title="Open in form">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button className="icon-btn hover:!text-rose-600" onClick={() => onDelete(r)} aria-label={`Delete row ${r.no}`} title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-900/90 dark:text-slate-400">
            <tr>
              {HEADERS.map((h) => (
                <th key={h.label} scope="col" className={`whitespace-nowrap px-3 py-3 font-medium ${h.align === "right" ? "text-right" : ""}`}
                  aria-sort={h.key && sort.key === h.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {h.key ? (
                    <button className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white ${h.align === "right" ? "flex-row-reverse" : ""}`} onClick={() => onSort(h.key!)}>
                      {h.label}
                      <SortIcon active={sort.key === h.key} dir={sort.dir} />
                    </button>
                  ) : h.label}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const editing = editingId === r.id;
              return (
                <tr
                  key={r.id}
                  onKeyDown={editing ? onKeyDown : undefined}
                  onDoubleClick={() => !editing && startEdit(r)}
                  className={`group transition-colors ${editing ? "bg-emerald-50/60 dark:bg-emerald-500/5" : "hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"} ${flashIds.has(r.id) && !editing ? "animate-flash" : ""}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{r.no}</td>
                  {editing ? (
                    <>
                      <td className="px-2 py-2"><input {...bind("institute")} autoFocus /></td>
                      <td className="px-2 py-2"><input type="date" {...bind("payments_closing_date")} /></td>
                      <td className="px-2 py-2"><input type="date" {...bind("applications_closing_date")} /></td>
                      <td className="px-2 py-2"><input {...bind("application_mode")} list="dl-modes" /></td>
                      <td className="px-2 py-2"><input {...bind("method_of_payment")} list="dl-payments" /></td>
                      <td className="px-2 py-2"><input inputMode="decimal" {...bind("registration_fee")} style={{ textAlign: "right" }} /></td>
                      <td className="px-2 py-2"><input inputMode="decimal" {...bind("other_charges")} style={{ textAlign: "right" }} /></td>
                      <td className="px-2 py-2"><input type="date" {...bind("application_sent_date")} /></td>
                      <td className="px-2 py-2">
                        <select {...bind("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                      </td>
                      <td className="px-2 py-2"><input {...bind("remarks")} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-medium">{r.institute}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.payments_closing_date)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.applications_closing_date)}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.application_mode ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.method_of_payment ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatMoney(r.registration_fee)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatMoney(r.other_charges)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.application_sent_date)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400" title={r.remarks ?? ""}>{r.remarks || "—"}</td>
                    </>
                  )}
                  <td className="px-3 py-2">
                    <div className={editing ? "" : "opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100"}>{actions(r, editing)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards: inline editing is cramped here, so edits go through the full form. */}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={`px-4 py-3 ${flashIds.has(r.id) ? "animate-flash" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">#{r.no}</span>
                  <span className="truncate font-medium">{r.institute}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Sent {formatDate(r.application_sent_date)} · Closes {formatDate(r.applications_closing_date)}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm tabular-nums">
                {formatMoney(r.registration_fee + r.other_charges)}
                <span className="ml-1 text-xs text-slate-400">{r.method_of_payment ?? ""}</span>
              </div>
              <div className="flex gap-1">
                <button className="icon-btn" onClick={() => onOpenEdit(r)} aria-label={`Edit row ${r.no}`}><Pencil className="h-4 w-4" /></button>
                <button className="icon-btn" onClick={() => onDelete(r)} aria-label={`Delete row ${r.no}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {r.remarks && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{r.remarks}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
