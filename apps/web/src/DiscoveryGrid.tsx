import { useEffect, useState } from "react";
import { api, ApiError, DiscoveryParams, DiscoveryProfile, getMediaUrl, Profile } from "./api";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const street = [a.road, a.house_number].filter(Boolean).join(" ") || null;
    const city = a.city ?? a.town ?? a.village ?? a.county ?? null;
    const place = [street, city].filter(Boolean).join(", ");
    return place || null;
  } catch {
    return null;
  }
}

function LocationStatus() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (profile?.locationShared && profile.latitude != null && profile.longitude != null) {
      reverseGeocode(profile.latitude, profile.longitude).then(setPlaceName);
    } else {
      setPlaceName(null);
    }
  }, [profile?.locationShared, profile?.latitude, profile?.longitude]);

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
      className={`text-xs ${profile.locationShared ? "text-emerald-400" : "text-slate-500"}`}
    >
      {requesting
        ? "Locating…"
        : profile.locationShared
          ? (placeName ?? "Location on")
          : "Location off"}
    </button>
  );
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
          <button
            key={p.userId}
            onClick={() => onViewProfile(p.userId)}
            className={`block rounded-lg bg-slate-900 p-3 space-y-1 text-left ${p.isSelf ? "ring-1 ring-indigo-500" : ""}`}
          >
            {p.profilePhotoStorageKey ? (
              <img
                src={getMediaUrl(p.profilePhotoStorageKey)}
                alt=""
                className="aspect-square w-full rounded-md bg-slate-800 object-cover mb-1"
              />
            ) : (
              <div className="aspect-square w-full rounded-md bg-slate-800 mb-1" />
            )}
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
          </button>
        ))}
      </div>
    </div>
  );
}
