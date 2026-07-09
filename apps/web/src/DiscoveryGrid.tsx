import { useEffect, useState } from "react";
import { api, ApiError, DiscoveryParams, DiscoveryProfile, getMediaUrl } from "./api";
import { OnlineDot } from "./presence";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function DiscoveryGrid({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoveryParams>({ sort: "distance" });

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .discover(filters)
      .then(setProfiles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Grid</h1>
      </div>

      <div className="flex flex-nowrap gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilters((f) => ({ ...f, sort: f.sort === "distance" ? "new" : "distance" }))}
          className="shrink-0 rounded-full bg-slate-900 px-4 text-xs"
        >
          {filters.sort === "new" ? "New users" : "Nearby"}
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, onlineOnly: !f.onlineOnly }))}
          className={`shrink-0 rounded-full px-4 text-xs ${filters.onlineOnly ? "bg-indigo-600" : "bg-slate-900"}`}
        >
          Online now
        </button>
        <select
          value={filters.role ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value || undefined }))}
          className="shrink-0 rounded-full bg-slate-900 px-4 text-xs"
        >
          <option value="">Any role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={filters.bodyType ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, bodyType: e.target.value || undefined }))}
          className="shrink-0 rounded-full bg-slate-900 px-4 text-xs"
        >
          <option value="">Any body type</option>
          {BODY_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <input
          placeholder="#hashtag"
          value={filters.hashtag ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, hashtag: e.target.value || undefined }))}
          className="shrink-0 w-28 rounded-full bg-slate-900 px-4 text-xs outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && profiles.length === 0 && (
        <p className="text-slate-500 text-sm">No one matches these filters yet.</p>
      )}

      {/* Stale results stay rendered (dimmed) while a filter change refetches — swapping to a
          "Loading…" line collapses the grid and makes the whole screen jump. */}
      <div className={`grid grid-cols-2 gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {profiles.map((p) => (
          <button
            key={p.userId}
            onClick={() => onViewProfile(p.userId)}
            className={`block rounded-lg bg-slate-900 p-3 space-y-1 text-left ${p.isSelf ? "ring-1 ring-indigo-500" : ""}`}
          >
            <div className="relative mb-1">
              {p.profilePhotoStorageKey ? (
                <img
                  src={getMediaUrl(p.profilePhotoStorageKey)}
                  alt=""
                  className="aspect-square w-full rounded-md bg-slate-800 object-cover"
                />
              ) : (
                <div className="aspect-square w-full rounded-md bg-slate-800" />
              )}
              <OnlineDot lastSeenAt={p.lastSeenAt} className="absolute right-2 top-2 ring-2 ring-slate-950/60" />
            </div>
            <p className="font-medium truncate">{p.displayName}</p>
            <p className="text-xs text-slate-400">
              {[p.isSelf ? "You" : null, p.age, p.role?.replace("_", " "), formatDistance(p.distanceMeters)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {p.verifiedBadgeTier > 0 && <p className="text-xs text-indigo-400">Verified</p>}
          </button>
        ))}
      </div>
      {loading && profiles.length === 0 && <p className="text-slate-500 text-sm">Loading…</p>}
    </div>
  );
}
