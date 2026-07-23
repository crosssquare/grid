import { useEffect, useState } from "react";
import { api, ApiError, DiscoveryParams, DiscoveryProfile, getMediaUrl } from "./api";
import { OnlineDot } from "./presence";
import { LocationLine } from "./LocationLine";

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
  const [search, setSearch] = useState("");

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: search.trim() || undefined })),
      300
    );
    return () => clearTimeout(t);
  }, [search]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 pt-3 pb-24">
      <h1 className="text-xl font-semibold">Guys</h1>
      <LocationLine />

      {/* Full-bleed: -mx-4 cancels the screen's px-4 so chips scroll all the way to the
          viewport edge instead of being clipped by the gutter; px-4 puts the gutter back
          inside the scroller so the strip still lines up with the page at rest. */}
      <div className="-mx-4 flex flex-nowrap gap-2 mb-4 overflow-x-auto px-4">
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
          onChange={(e) => {
            setFilters((f) => ({ ...f, role: e.target.value || undefined }));
            e.target.blur();
          }}
          className="shrink-0 appearance-none rounded-full bg-slate-900 px-4 text-xs outline-none focus:outline-none focus:ring-0"
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
          onChange={(e) => {
            setFilters((f) => ({ ...f, bodyType: e.target.value || undefined }));
            e.target.blur();
          }}
          className="shrink-0 appearance-none rounded-full bg-slate-900 px-4 text-xs outline-none focus:outline-none focus:ring-0"
        >
          <option value="">Any body type</option>
          {BODY_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Full-width search under the chips — matches name, bio and hashtags, not just #tags. */}
      <div className="relative mb-4">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, bio or #tag"
          className="w-full rounded-full bg-slate-900 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-700"
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
