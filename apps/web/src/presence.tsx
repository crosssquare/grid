const ONLINE_WINDOW_MS = 30 * 60 * 1000;

export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OnlineDot({ lastSeenAt, className = "" }: { lastSeenAt: string | null | undefined; className?: string }) {
  if (!lastSeenAt) return null;
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${isOnline(lastSeenAt) ? "bg-emerald-400" : "bg-slate-600"} ${className}`}
    />
  );
}
