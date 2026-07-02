import { useEffect, useState } from "react";
import { api, ApiError, DiscoveryParams, DiscoveryProfile, Profile } from "./api";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function LocationStatus() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    api
      .getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  function shareLocation() {
    if (!profile) return; // no profile created yet — nothing to attach a location to
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await api.saveMyProfile({
            ...profile,
            locationShared: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setProfile(updated);
        } finally {
          setRequesting(false);
        }
      },
      () => setRequesting(false),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  if (!profile) return null;

  return (
    <button
      onClick={shareLocation}
      disabled={requesting}
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
        profile.locationShared ? "bg-emerald-900 text-emerald-300" : "bg-slate-900 text-slate-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${profile.locationShared ? "bg-emerald-400" : "bg-slate-500"}`} />
      {requesting ? "Locating…" : profile.locationShared ? "Location on" : "Location off"}
    </button>
  );
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Grid</h1>
        <LocationStatus />
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

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && profiles.length === 0 && (
        <p className="text-slate-500 text-sm">No one matches these filters yet.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {profiles.map((p) => (
          <div
            key={p.userId}
            className={`rounded-lg bg-slate-900 p-3 space-y-1 ${p.isSelf ? "ring-1 ring-indigo-500" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">{p.displayName}</p>
              {p.onlineStatus === "online" && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              {[p.isSelf ? "You" : null, p.age, p.role?.replace("_", " "), formatDistance(p.distanceMeters)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {p.verifiedBadgeTier > 0 && <p className="text-xs text-indigo-400">Verified</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
