import { ReactNode, TouchEvent, useRef, useState } from "react";

const THRESHOLD = 70;
const MAX_PULL = 100;

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => void; children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const pullDistance = useRef(0);

  function onTouchStart(e: TouchEvent) {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging.current || startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      const next = Math.min(delta * 0.5, MAX_PULL);
      pullDistance.current = next;
      setPull(next);
    } else {
      dragging.current = false;
      pullDistance.current = 0;
      setPull(0);
    }
  }

  function onTouchEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    startY.current = null;
    if (pullDistance.current > THRESHOLD) {
      setRefreshing(true);
      setPull(48);
      // Remounting the active screen (via a key bump) re-triggers its own data
      // fetch — simplest way to refresh without each screen exposing a refetch handle.
      onRefresh();
      window.setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 500);
    } else {
      setPull(0);
    }
    pullDistance.current = 0;
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pull }}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-slate-600 border-t-indigo-400 ${
            refreshing ? "animate-spin" : ""
          }`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
