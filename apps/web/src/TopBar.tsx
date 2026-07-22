import { useEffect, useState } from "react";
import { api } from "./api";
import { reverseGeocode } from "./geo";

// Own location (street level) lives here, centered between the Upgrade CTA and the bell.
// Tapping it re-captures the device position and saves it ("Sync") — for when you've
// moved and the stored location is stale.
function LocationSync() {
  const [label, setLabel] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        if (p.locationShared && p.latitude != null && p.longitude != null) {
          setShared(true);
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
          setShared(true);
          setLabel(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
        } catch {
          // keep the old label; nothing actionable to show up here
        } finally {
          setSyncing(false);
        }
      },
      () => setSyncing(false),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  // TODO: tapping this should open a bottom sheet to change or hide the location —
  // for now it re-syncs directly. The green dot means a location is currently shared.
  return (
    <button
      onClick={sync}
      aria-label={label ? `Location: ${label}. Tap to re-sync.` : "Sync location"}
      title={label ?? "Sync location"}
      className={`text-slate-300 ${syncing ? "opacity-50" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"
        />
        {/* The pin's eye doubles as the shared-location indicator: filled emerald
            when a location is currently shared, hollow otherwise. */}
        <circle cx="12" cy="10" r="2.5" fill={shared ? "#34d399" : "none"} stroke={shared ? "#34d399" : "currentColor"} />
      </svg>
    </button>
  );
}

export function TopBar({ onUpgrade, onNotifications }: { onUpgrade: () => void; onNotifications: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-950/90 backdrop-blur-sm px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <button
        onClick={onUpgrade}
        className="flex h-8 min-h-[32px] items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 text-xs font-semibold text-slate-950"
      >
        Upgrade
      </button>
      <div className="flex items-center gap-3">
        <LocationSync />
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
    </div>
  );
}
