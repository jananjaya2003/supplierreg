import type { LiveStatus } from "@/lib/useRegistrations";

const MAP: Record<LiveStatus, { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  connecting: { label: "Connecting…", dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
  offline: { label: "Offline", dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300" },
};

export default function LiveIndicator({ status }: { status: LiveStatus }) {
  const m = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs font-medium backdrop-blur dark:border-white/10 dark:bg-slate-900/60 ${m.text}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {status === "live" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${m.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${m.dot}`} />
      </span>
      {m.label}
    </span>
  );
}
