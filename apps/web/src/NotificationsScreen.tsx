import { useEffect, useState } from "react";
import { api, ApiError, getMediaUrl, Notification } from "./api";
import { Lightbox } from "./Lightbox";
import { timeAgo } from "./presence";

export function NotificationsScreen({
  onBack,
  onViewProfile
}: {
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const myUserId = localStorage.getItem("userId");

  useEffect(() => {
    api
      .listNotifications()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  // Tap-through: a like opens the photo it's about; a review opens your own profile,
  // where the review lives.
  function open(n: Notification) {
    if (n.kind === "like" && n.mediaStorageKey && n.mediaType === "photo") {
      setLightboxSrc(getMediaUrl(n.mediaStorageKey));
    } else if (n.kind === "review" && myUserId) {
      onViewProfile(myUserId);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-slate-400">
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Notifications</h1>
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && items.length === 0 && <p className="text-slate-500 text-sm">Nothing yet.</p>}

      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={`${n.kind}-${n.id}`}
            onClick={() => open(n)}
            className="flex cursor-pointer items-center gap-3 rounded-md bg-slate-900 p-3 text-sm"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(n.actorId);
              }}
              className="shrink-0"
            >
              {n.actorProfilePhotoStorageKey ? (
                <img
                  src={getMediaUrl(n.actorProfilePhotoStorageKey)}
                  alt=""
                  className="h-10 w-10 rounded-full bg-slate-800 object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-slate-800" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile(n.actorId);
                  }}
                  className="font-medium text-slate-100"
                >
                  {n.actorDisplayName}
                </button>{" "}
                {n.kind === "like" ? (
                  <span className="text-slate-400">liked your photo</span>
                ) : n.reviewStatus === "pending" ? (
                  <span className="text-slate-400">left you a review, awaiting your approval</span>
                ) : (
                  <span className="text-slate-400">left you a review</span>
                )}
              </p>
              {n.kind === "review" && n.rating != null && (
                <p className="text-indigo-400 text-xs">{"★".repeat(n.rating)}</p>
              )}
              <p className="text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
            </div>

            {n.kind === "like" && n.mediaStorageKey && n.mediaType === "photo" && (
              <img
                src={getMediaUrl(n.mediaStorageKey)}
                alt=""
                className="h-12 w-12 rounded-md bg-slate-800 object-cover shrink-0"
              />
            )}
          </div>
        ))}
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
