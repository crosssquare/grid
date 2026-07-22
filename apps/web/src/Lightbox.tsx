import { useState } from "react";
import { FlameIcon } from "./FlameIcon";

export function Lightbox({
  src,
  onClose,
  like,
  onDelete
}: {
  src: string;
  onClose: () => void;
  like?: { count: number; liked: boolean; onToggle: () => void };
  // Passed only for photos the viewer owns. Deleting is irreversible, so it always
  // goes through the in-lightbox confirmation below.
  onDelete?: () => Promise<void> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 text-2xl text-slate-200"
      >
        ×
      </button>
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" className="max-h-full max-w-full rounded-md object-contain" />
        {onDelete && (
          <button
            onClick={() => setConfirming(true)}
            aria-label="Delete photo"
            title="Delete photo"
            className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-slate-200 backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        )}
        {like && (
          <button
            onClick={like.onToggle}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm"
          >
            <FlameIcon active={like.liked} className={`h-6 w-6 ${like.liked ? "" : "text-slate-200"}`} />
            <span className="text-sm font-medium text-slate-100">{like.count}</span>
          </button>
        )}
      </div>

      {confirming && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-6"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete photo"
            className="w-full max-w-xs rounded-lg bg-slate-900 p-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-100">Delete this photo?</p>
            <p className="mt-1 text-xs text-slate-400">
              It'll be removed from your profile and any post it's attached to. This can't be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="flex-1 rounded-md bg-slate-800 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
