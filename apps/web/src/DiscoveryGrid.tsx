import { useEffect, useState } from "react";
import { api, ApiError, DiscoveryParams, DiscoveryProfile } from "./api";
import { inputClass } from "./Field";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function DiscoveryGrid() {
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
      <h1 className="text-xl font-semibold mb-4">Grid</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilters((f) => ({ ...f, sort: f.sort === "distance" ? "new" : "distance" }))}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs"
        >
          {filters.sort === "new" ? "New users" : "Nearby"}
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, onlineOnly: !f.onlineOnly }))}
          className={`rounded-full px-3 py-1.5 text-xs ${filters.onlineOnly ? "bg-indigo-600" : "bg-slate-900"}`}
        >
          Online now
        </button>
        <select
          value={filters.role ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value || undefined }))}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs"
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
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs"
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
          className={`${inputClass} w-28 rounded-full px-3 py-1.5 text-xs`}
        />
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && profiles.length === 0 && (
        <p className="text-slate-500 text-sm">No one matches these filters yet.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {profiles.map((p) => (
          <div key={p.userId} className="rounded-lg bg-slate-900 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">{p.displayName}</p>
              {p.onlineStatus === "online" && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              {[p.age, p.role?.replace("_", " "), formatDistance(p.distanceMeters)].filter(Boolean).join(" · ")}
            </p>
            {p.verifiedBadgeTier > 0 && <p className="text-xs text-indigo-400">Verified</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
