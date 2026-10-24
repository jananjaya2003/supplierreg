"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExcelExportButton from "@/components/ExcelExportButton";
import LiveIndicator from "@/components/LiveIndicator";
import Modal from "@/components/Modal";
import RegistrationForm from "@/components/RegistrationForm";
import RegistrationTable, { type SortKey, type SortState } from "@/components/RegistrationTable";
import { EmptyState, ErrorState, LoadingRows } from "@/components/States";
import { STATUS_STYLES } from "@/components/StatusBadge";
import { STATUSES, type Registration, type RegistrationInput, type Status } from "@/lib/types";
import { useRegistrations } from "@/lib/useRegistrations";

const uniq = (xs: (string | null)[]) =>
  Array.from(new Set(xs.filter((x): x is string => Boolean(x)))).sort((a, b) => a.localeCompare(b));

function compare(a: Registration, b: Registration, key: SortKey): number {
  const va = a[key], vb = b[key];
  // Empty values always sink to the bottom regardless of direction.
  if (va === null || va === "") return vb === null || vb === "" ? 0 : 1;
  if (vb === null || vb === "") return -1;
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  return String(va).localeCompare(String(vb), undefined, { numeric: true });
}

export default function DashboardPage() {
  const { rows, loading, error, live, flashIds, create, update, remove, reload } = useRegistrations();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [sort, setSort] = useState<SortState>({ key: "no", dir: "asc" });
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; row: Registration } | null>(null);
  const [toDelete, setToDelete] = useState<Registration | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const s of STATUSES) c[s] = 0;
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.no, r.institute, r.application_mode, r.method_of_payment, r.remarks, r.status]
        .some((v) => v !== null && String(v).toLowerCase().includes(q));
    });
    const sign = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const c = compare(a, b, sort.key);
      // Keep nulls at the bottom in both directions.
      const aNull = a[sort.key] === null, bNull = b[sort.key] === null;
      return aNull || bNull ? c : c * sign;
    });
  }, [rows, deferredQuery, statusFilter, sort]);

  const suggestions = useMemo(
    () => ({
      institutes: uniq(rows.map((r) => r.institute)),
      modes: uniq(rows.map((r) => r.application_mode)),
      payments: uniq(rows.map((r) => r.method_of_payment)),
    }),
    [rows]
  );

  const onSort = useCallback((key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }, []);

  async function handleCreate(data: RegistrationInput) {
    try {
      const r = await create(data);
      toast.success(`Record #${r.no} created`, { description: r.institute });
      setModal(null);
    } catch (e) {
      toast.error("Couldn't create record", { description: (e as Error).message });
    }
  }

  async function handleUpdate(id: string, data: RegistrationInput) {
    try {
      const r = await update(id, data);
      toast.success(`Record #${r.no} updated`, { description: r.institute });
    } catch (e) {
      toast.error("Couldn't save changes", { description: (e as Error).message });
      throw e;
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await remove(toDelete.id);
      toast.success(`Record #${toDelete.no} deleted`, { description: toDelete.institute });
      setToDelete(null);
    } catch (e) {
      toast.error("Couldn't delete record", { description: (e as Error).message });
    }
  }

  const filtersActive = query !== "" || statusFilter !== "All";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Supplier registrations</h1>
            <LiveIndicator status={live} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track every institute&apos;s registration, payment deadlines and status in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelExportButton />
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New record
          </button>
        </div>
      </div>

      <section className="glass overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search institute, payment, remarks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search records"
            />
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0" role="tablist" aria-label="Filter by status">
            {(["All", ...STATUSES] as const).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(s)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                  }`}
                >
                  {s !== "All" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_STYLES[s].color }} />}
                  {s}
                  <span className={`tabular-nums ${active ? "opacity-70" : "text-slate-400"}`}>{counts[s] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            hint="Create the first record, or run supabase/seed.sql to import your spreadsheet."
            action={<button className="btn-primary" onClick={() => setModal({ mode: "create" })}><Plus className="h-4 w-4" /> New record</button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No matches"
            hint="Nothing fits the current search and filter."
            action={<button className="btn-outline" onClick={() => { setQuery(""); setStatusFilter("All"); }}><X className="h-4 w-4" /> Clear filters</button>}
          />
        ) : (
          <RegistrationTable
            rows={visible}
            sort={sort}
            onSort={onSort}
            flashIds={flashIds}
            onOpenEdit={(row) => setModal({ mode: "edit", row })}
            onDelete={setToDelete}
            onInlineSave={handleUpdate}
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Showing {visible.length} of {rows.length}
              {filtersActive && " (filtered)"}
            </span>
            <span className="hidden md:inline">Double-click a row to edit inline · Enter to save · Esc to cancel</span>
          </div>
        )}
      </section>

      <datalist id="dl-institutes">{suggestions.institutes.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-modes">{suggestions.modes.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-payments">{suggestions.payments.map((s) => <option key={s} value={s} />)}</datalist>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit record #${modal.row.no}` : "New registration"}
        description={modal?.mode === "edit" ? modal.row.institute : "Add a supplier registration to the tracker."}
      >
        {modal && (
          <RegistrationForm
            key={modal.mode === "edit" ? modal.row.id : "new"}
            initial={modal.mode === "edit" ? modal.row : null}
            onCancel={() => setModal(null)}
            onSubmit={async (data) => {
              if (modal.mode === "edit") {
                await handleUpdate(modal.row.id, data).then(() => setModal(null), () => {});
              } else {
                await handleCreate(data);
              }
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this record?"
        message={
          toDelete && (
            <>
              Record <strong>#{toDelete.no}</strong> for <strong>{toDelete.institute}</strong> will be permanently removed for
              everyone. This can&apos;t be undone.
            </>
          )
        }
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
