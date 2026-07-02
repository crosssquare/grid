export function FlameIcon({ active, className }: { active: boolean; className?: string }) {
  const flamePath =
    "M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-.5-2-.5-2 2 1 3.5 3.5 3.5 6a7 7 0 1 1-14 0c0-4 2-6 3-8 .5 2 1.5 2.5 2 2 .8-.6-1-2.5 0-5Z";
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {active && (
        <defs>
          <linearGradient id="flame-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      )}
      <path
        d={flamePath}
        fill={active ? "url(#flame-gradient)" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
