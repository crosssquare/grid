import { useEffect, useState } from "react";
import { api, getMediaUrl } from "./api";

export function TopBar({
  onProfile,
  onChat,
  onUpgrade,
  onNotifications
}: {
  onProfile: () => void;
  onChat: () => void;
  onUpgrade: () => void;
  onNotifications: () => void;
}) {
  const [photoKey, setPhotoKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => setPhotoKey(p.profilePhotoStorageKey ?? null))
      .catch(() => undefined);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-950/90 backdrop-blur-sm px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center gap-2">
        {/* Your own profile is a destination, not a tab — it hangs off the avatar here. */}
        <button onClick={onProfile} aria-label="Your profile" className="shrink-0">
          {photoKey ? (
            <img src={getMediaUrl(photoKey)} alt="" className="h-8 w-8 rounded-full bg-slate-800 object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0Z" />
              </svg>
            </span>
          )}
        </button>
        <button
          onClick={onUpgrade}
          className="flex h-8 min-h-[32px] items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 text-xs font-semibold text-slate-950"
        >
          Upgrade
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onChat} aria-label="Chat" className="text-slate-300">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6.5 8.5 6.5 8.5-6.5" />
          </svg>
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
    </div>
  );
}
