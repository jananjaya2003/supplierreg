import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { Status } from "@/lib/types";

export const STATUS_STYLES: Record<Status, { cls: string; color: string; icon: typeof Clock }> = {
  Complete: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    color: "#0ca30c",
    icon: CheckCircle2,
  },
  "In Progress": {
    cls: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
    color: "#2a78d6",
    icon: Loader2,
  },
  Pending: {
    cls: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    color: "#eda100",
    icon: Clock,
  },
  Rejected: {
    cls: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
    color: "#d03b3b",
    icon: XCircle,
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
