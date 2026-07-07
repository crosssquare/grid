export function TopBar({ onUpgrade, onNotifications }: { onUpgrade: () => void; onNotifications: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-950/90 backdrop-blur-sm px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <button
        onClick={onUpgrade}
        className="flex h-8 min-h-[32px] items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 text-xs font-semibold text-slate-950"
      >
        Upgrade
      </button>
      <button onClick={onNotifications} aria-label="Notifications" className="text-slate-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      </button>
    </div>
  );
}
