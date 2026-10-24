"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} size="sm">
      <div className="flex gap-3 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await onConfirm(); } finally { setBusy(false); }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
