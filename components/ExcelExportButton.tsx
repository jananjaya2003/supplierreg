"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { STATUSES, TABLE, type Registration } from "@/lib/types";

export const EXPORT_FILENAME = "Supplier_Registration_Status_Export.xlsx";

const COLUMNS: { key: keyof Registration | "total"; header: string; width: number; kind?: "date" | "money" | "datetime" }[] = [
  { key: "no", header: "No", width: 6 },
  { key: "institute", header: "Institute", width: 22 },
  { key: "payments_closing_date", header: "Payments Closing Date", width: 16, kind: "date" },
  { key: "applications_closing_date", header: "Applications Closing Date", width: 16, kind: "date" },
  { key: "application_mode", header: "Application Mode", width: 16 },
  { key: "method_of_payment", header: "Method of Payment", width: 18 },
  { key: "units", header: "Units", width: 8 },
  { key: "unit_price", header: "Unit Price", width: 14, kind: "money" },
  { key: "registration_fee", header: "Registration Fee", width: 14, kind: "money" },
  { key: "other_charges", header: "Other Charges", width: 14, kind: "money" },
  { key: "total", header: "Total", width: 14, kind: "money" },
  { key: "application_sent_date", header: "Application Sent Date", width: 16, kind: "date" },
  { key: "status", header: "Status", width: 12 },
  { key: "remarks", header: "Remarks", width: 40 },
  { key: "updated_at", header: "Last Updated", width: 18, kind: "datetime" },
];

const MONEY_FMT = "#,##0.00";
const DATE_FMT = "dd-mmm-yyyy";
const DATETIME_FMT = "dd-mmm-yyyy hh:mm";

/** Calendar date → Excel serial, computed in UTC so no timezone can shift it by a day. */
function dateSerial(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/** Timestamp → Excel serial in the viewer's local time (what they expect to read). */
function dateTimeSerial(iso: string): number {
  const t = new Date(iso);
  const local = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
  return (local - Date.UTC(1899, 11, 30)) / 86_400_000;
}

async function buildWorkbook(rows: Registration[]) {
  const XLSX = await import("xlsx");
  type Cell = import("xlsx").CellObject;

  const header: Cell[] = COLUMNS.map((c) => ({ t: "s", v: c.header }));
  const body: Cell[][] = rows.map((r) =>
    COLUMNS.map((c): Cell => {
      const raw = c.key === "total" ? Number(r.registration_fee) + Number(r.other_charges) : r[c.key];
      if (raw === null || raw === undefined || raw === "") return { t: "z" };
      if (c.kind === "money") return { t: "n", v: Number(raw), z: MONEY_FMT };
      if (c.kind === "date") return { t: "n", v: dateSerial(String(raw)), z: DATE_FMT };
      if (c.kind === "datetime") return { t: "n", v: dateTimeSerial(String(raw)), z: DATETIME_FMT };
      if (typeof raw === "number") return { t: "n", v: raw };
      return { t: "s", v: String(raw) };
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: COLUMNS.length - 1 } }) };

  // Summary sheet
  const sum = (f: (r: Registration) => number) => rows.reduce((a, r) => a + f(r), 0);
  const summary: (string | number)[][] = [
    ["Supplier Registration Status — Summary"],
    ["Exported at", new Date().toLocaleString("en-GB")],
    [],
    ["Metric", "Value"],
    ["Total applications", rows.length],
    ...STATUSES.map((s) => [`Status: ${s}`, rows.filter((r) => r.status === s).length]),
    ["Total registration fees", sum((r) => Number(r.registration_fee))],
    ["Total other charges", sum((r) => Number(r.other_charges))],
    ["Revenue collected (Complete only)", sum((r) => (r.status === "Complete" ? Number(r.registration_fee) + Number(r.other_charges) : 0))],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2["!cols"] = [{ wch: 34 }, { wch: 22 }];
  for (let r = summary.length - 3; r < summary.length; r++) {
    const cell = ws2[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell) cell.z = MONEY_FMT;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registrations");
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");
  wb.Props = { Title: "Supplier Registration Status", CreatedDate: new Date() };
  XLSX.writeFile(wb, EXPORT_FILENAME, { compression: true });
}

export default function ExcelExportButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    const t = toast.loading("Preparing Excel export…");
    try {
      const { data, error } = await getSupabase().from(TABLE).select("*").order("no", { ascending: true });
      if (error) throw new Error(error.message);
      await buildWorkbook((data ?? []) as Registration[]);
      toast.success(`Exported ${data?.length ?? 0} records`, { id: t, description: EXPORT_FILENAME });
    } catch (e) {
      toast.error("Export failed", { id: t, description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleExport} disabled={busy} className={`btn-outline ${className}`}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      <span>Download Latest Excel</span>
    </button>
  );
}
