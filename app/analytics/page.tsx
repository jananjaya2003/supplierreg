"use client";

import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps,
} from "recharts";
import { Banknote, CheckCircle2, Clock, FileText } from "lucide-react";
import ExcelExportButton from "@/components/ExcelExportButton";
import LiveIndicator from "@/components/LiveIndicator";
import { EmptyState, ErrorState } from "@/components/States";
import { STATUS_STYLES } from "@/components/StatusBadge";
import { useChartTheme } from "@/lib/chartTheme";
import { formatCompact, formatMoney, total } from "@/lib/format";
import { STATUSES, type Status } from "@/lib/types";
import { useRegistrations } from "@/lib/useRegistrations";

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function KpiCard({
  label, value, hint, icon: Icon, accent,
}: { label: string; value: string; hint: string; icon: typeof FileText; accent: string }) {
  return (
    <div className="glass p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, table }: { title: string; subtitle?: string; children: React.ReactNode; table: React.ReactNode }) {
  return (
    <section className="glass flex flex-col p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </header>
      <div className="flex-1">{children}</div>
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          View as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">{table}</div>
      </details>
    </section>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left">
      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        <tr>{head.map((h, i) => <th key={h} className={`px-3 py-1.5 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j ? "text-right" : ""}`}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartTooltip({ active, payload, label, valueSuffix = "" }: TooltipProps<number, string> & { valueSuffix?: string }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => Number(p.value) > 0);
  const sum = items.reduce((a, p) => a + Number(p.value), 0);
  return (
    <div className="min-w-[150px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      {label !== undefined && <div className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</div>}
      {items.map((p) => (
        <div key={p.dataKey as string} className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-slate-900 dark:text-white">{p.value}{valueSuffix}</span>
        </div>
      ))}
      {items.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-medium dark:border-slate-800">
          <span>Total</span><span className="tabular-nums">{sum}</span>
        </div>
      )}
    </div>
  );
}

function StatusLegend() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {STATUSES.map((s) => {
        const Icon = STATUS_STYLES[s].icon;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" style={{ color: STATUS_STYLES[s].color }} aria-hidden />
            {s}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

export default function AnalyticsPage() {
  const { rows, loading, error, live, reload } = useRegistrations();
  const theme = useChartTheme();

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    let billed = 0, collected = 0, outstanding = 0;
    for (const r of rows) {
      byStatus[r.status]++;
      const t = total(r);
      billed += t;
      if (r.status === "Complete") collected += t;
      if (r.status === "Pending") outstanding += t;
    }

    // Institutes: stacked by status, sorted by volume.
    const inst = new Map<string, Record<Status, number> & { institute: string; total: number }>();
    for (const r of rows) {
      const k = r.institute;
      if (!inst.has(k)) inst.set(k, { institute: k, total: 0, Complete: 0, "In Progress": 0, Pending: 0, Rejected: 0 });
      const e = inst.get(k)!;
      e[r.status]++;
      e.total++;
    }
    const institutes = Array.from(inst.values()).sort((a, b) => b.total - a.total || a.institute.localeCompare(b.institute));

    // Timeline: applications sent per month, with empty months filled so gaps read as zero.
    const counts = new Map<string, number>();
    for (const r of rows) if (r.application_sent_date) {
      const k = monthKey(r.application_sent_date);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const keys = Array.from(counts.keys()).sort();
    const timeline: { month: string; label: string; count: number }[] = [];
    if (keys.length) {
      let [y, m] = keys[0].split("-").map(Number);
      const [ey, em] = keys[keys.length - 1].split("-").map(Number);
      while (y < ey || (y === ey && m <= em)) {
        const k = `${y}-${String(m).padStart(2, "0")}`;
        timeline.push({ month: k, label: monthLabel(k), count: counts.get(k) ?? 0 });
        if (++m > 12) { m = 1; y++; }
      }
    }

    const statusData = STATUSES.map((s) => ({ name: s, value: byStatus[s] })).filter((d) => d.value > 0);
    return { byStatus, billed, collected, outstanding, institutes, timeline, statusData };
  }, [rows]);

  const n = rows.length;
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0);
  const axisProps = { stroke: theme.axis, tick: { fill: theme.text, fontSize: 12 }, tickLine: false, axisLine: { stroke: theme.grid } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <LiveIndicator status={live} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Updates automatically as records change.</p>
        </div>
        <ExcelExportButton />
      </div>

      {error ? (
        <div className="glass"><ErrorState message={error} onRetry={reload} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total applications" value={loading ? "—" : String(n)} hint={`${stats.institutes.length} institutes`}
              icon={FileText} accent="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
            <KpiCard label="Completed" value={loading ? "—" : String(stats.byStatus.Complete)} hint={`${pct(stats.byStatus.Complete)}% of all applications`}
              icon={CheckCircle2} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
            <KpiCard label="Pending payments" value={loading ? "—" : String(stats.byStatus.Pending)} hint={`${formatMoney(stats.outstanding)} outstanding`}
              icon={Clock} accent="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
            <KpiCard label="Revenue collected" value={loading ? "—" : `LKR ${formatCompact(stats.collected)}`}
              hint={`Fee + other charges on completed · ${formatMoney(stats.billed)} across all`}
              icon={Banknote} accent="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
          </div>

          {!loading && n === 0 ? (
            <div className="glass"><EmptyState title="No data to chart yet" hint="Add records on the dashboard and they'll appear here instantly." /></div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <ChartCard
                  title="Applications by institute"
                  subtitle="Stacked by status, busiest first"
                  table={<DataTable head={["Institute", ...STATUSES, "Total"]} rows={stats.institutes.map((i) => [i.institute, ...STATUSES.map((s) => i[s]), i.total])} />}
                >
                  <div style={{ height: Math.max(220, stats.institutes.length * 34 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.institutes} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap={6}>
                        <CartesianGrid horizontal={false} stroke={theme.grid} />
                        <XAxis type="number" allowDecimals={false} {...axisProps} />
                        <YAxis type="category" dataKey="institute" width={110} {...axisProps} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.grid, opacity: 0.5 }} />
                        {STATUSES.map((s, i) => (
                          <Bar key={s} dataKey={s} name={s} stackId="s" fill={theme.status[s]} stroke={theme.surface} strokeWidth={2}
                            radius={i === STATUSES.length - 1 ? [0, 4, 4, 0] : 0} isAnimationActive={false} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3"><StatusLegend /></div>
                </ChartCard>
              </div>

              <div className="lg:col-span-2">
                <ChartCard
                  title="Status breakdown"
                  subtitle={`${n} applications`}
                  table={<DataTable head={["Status", "Count", "Share"]} rows={STATUSES.map((s) => [s, stats.byStatus[s], `${pct(stats.byStatus[s])}%`])} />}
                >
                  <div className="relative h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.statusData} dataKey="value" nameKey="name"
                          innerRadius="58%" outerRadius="80%" startAngle={90} endAngle={-270}
                          stroke={theme.surface} strokeWidth={2} isAnimationActive={false}
                          label={({ name, value }) => `${name} ${pct(value)}%`} labelLine={false}
                        >
                          {stats.statusData.map((d) => <Cell key={d.name} fill={theme.status[d.name as Status]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold">{n}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">total</span>
                    </div>
                  </div>
                  <div className="mt-3"><StatusLegend /></div>
                </ChartCard>
              </div>

              <div className="lg:col-span-5">
                <ChartCard
                  title="Applications sent over time"
                  subtitle="Count per month, by application sent date"
                  table={<DataTable head={["Month", "Applications sent"]} rows={stats.timeline.map((t) => [t.label, t.count])} />}
                >
                  {stats.timeline.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">No application sent dates recorded yet.</p>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.timeline} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={theme.series} stopOpacity={0.28} />
                              <stop offset="100%" stopColor={theme.series} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke={theme.grid} />
                          <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                          <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.axis, strokeDasharray: "3 3" }} />
                          <Area type="monotone" dataKey="count" name="Applications sent" stroke={theme.series} strokeWidth={2}
                            fill="url(#sentFill)" dot={stats.timeline.length <= 12 ? { r: 4, fill: theme.series, stroke: theme.surface, strokeWidth: 2 } : false}
                            activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
