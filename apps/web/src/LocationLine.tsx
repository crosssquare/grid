import { useEffect, useState } from "react";
import { api } from "./api";
import { reverseGeocode } from "./geo";

// Your own location, street level, shown under the title on Guys and Events.
// Other users' locations are only ever shown as a distance — see geo.ts.
export function LocationLine() {
  const [label, setLabel] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        if (p.locationShared && p.latitude != null && p.longitude != null) {
          reverseGeocode(p.latitude, p.longitude).then(setLabel);
        }
      })
      .catch(() => undefined);
  }, []);

  function sync() {
    if (syncing) return;
    setSyncing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const profile = await api.getMyProfile();
          await api.saveMyProfile({
            ...profile,
            locationShared: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLabel(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
        } catch {
          // keep the old label; nothing actionable to show here
        } finally {
          setSyncing(false);
        }
      },
      () => setSyncing(false),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  // TODO: the pencil should open a bottom sheet offering "refresh from GPS" or
  // "set somewhere else" — for now it re-syncs from the device directly.
  return (
    <div className={`mb-3 flex items-center gap-1.5 text-sm text-slate-400 ${syncing ? "opacity-50" : ""}`}>
      <span className="truncate">{label ?? "Set your location"}</span>
      <button onClick={sync} aria-label="Change location" title="Change location" className="shrink-0 text-slate-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10a2.83 2.83 0 1 0-4-4L4 16v4Z" />
        </svg>
      </button>
    </div>
  );
}
