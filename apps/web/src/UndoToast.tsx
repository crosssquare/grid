import { TouchEvent, useEffect, useRef, useState } from "react";

const UNDO_WINDOW_MS = 5000;

// Bottom floating undo affordance: shown for 5s after a destructive action, then fades
// out (at which point the caller commits the delete). Swipe sideways to dismiss early.
export function UndoToast({
  message,
  onUndo,
  onExpire
}: {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const expireTimer = useRef<number | null>(null);

  function expire(commit: boolean) {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      if (commit) onExpire();
    }, 200);
  }

  useEffect(() => {
    expireTimer.current = window.setTimeout(() => expire(true), UNDO_WINDOW_MS);
    return () => {
      if (expireTimer.current) window.clearTimeout(expireTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX;
  }

  function onTouchMove(e: TouchEvent) {
    if (startX.current == null) return;
    setDragX(e.touches[0].clientX - startX.current);
  }

  function onTouchEnd() {
    startX.current = null;
    if (Math.abs(dragX) > 80) {
      // Swiping away is a dismissal of the prompt, not of the delete — commit it.
      if (expireTimer.current) window.clearTimeout(expireTimer.current);
      expire(true);
    } else {
      setDragX(0);
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 shadow-lg transition-all duration-200 ${
        leaving ? "opacity-0 translate-y-2" : "opacity-100"
      }`}
      style={dragX !== 0 ? { transform: `translateX(${dragX}px)`, transition: "none" } : undefined}
    >
      <span className="text-sm text-slate-200">{message}</span>
      <button
        onClick={() => {
          if (expireTimer.current) window.clearTimeout(expireTimer.current);
          setLeaving(true);
          window.setTimeout(onUndo, 200);
        }}
        className="ml-3 shrink-0 text-sm font-semibold text-indigo-400"
      >
        Undo
      </button>
    </div>
  );
}
