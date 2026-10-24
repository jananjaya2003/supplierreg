import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="h-3 w-6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="hidden h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800 sm:block" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
      <AlertCircle className="h-8 w-8 text-rose-500" />
      <div>
        <p className="font-medium">Couldn&apos;t load records</p>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button className="btn-outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
