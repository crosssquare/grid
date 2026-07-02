import { useEffect, useState } from "react";
import { api, ApiError, ViewedProfile } from "./api";

const REPORT_REASONS = [
  { value: "fake_profile", label: "Fake profile" },
  { value: "underage_concern", label: "Underage concern" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "illegal_content", label: "Illegal content" },
  { value: "csam", label: "CSAM" }
];

function StatRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between border-b border-slate-800 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

export function ProfileView({
  userId,
  onBack,
  onMessage
}: {
  userId: string;
  onBack: () => void;
  onMessage: (conversationId: string, displayName: string) => void;
}) {
  const [profile, setProfile] = useState<ViewedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    api
      .getViewedProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"));
  }

  useEffect(load, [userId]);

  async function tap() {
    setTapped(true);
    await api.sendTap(userId).catch(() => undefined);
  }

  async function message() {
    const conversation = await api.startConversation(userId).catch(() => null);
    if (conversation && profile) onMessage(conversation.id, profile.displayName);
  }

  async function toggleFavorite() {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.isFavorited) {
        await api.removeFavorite(userId);
      } else {
        await api.addFavorite(userId);
      }
      setProfile({ ...profile, isFavorited: !profile.isFavorited });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function block() {
    setBusy(true);
    try {
      await api.block(userId);
      setNotice("Blocked. You won't see each other anymore.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function report(reasonCode: string) {
    setBusy(true);
    try {
      await api.report(userId, reasonCode);
      setShowReport(false);
      setNotice("Report submitted.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function weMet() {
    setBusy(true);
    try {
      await api.confirmMeet(userId);
      setNotice("Meet confirmed — once they confirm too, you can leave a review.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
        <button onClick={onBack} className="text-slate-400 mb-4">
          ← Back
        </button>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <button onClick={onBack} className="text-slate-400 mb-4">
        ← Back
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{profile.displayName}</h1>
          {profile.onlineStatus === "online" && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        </div>
        <p className="text-xs text-slate-500">
          Member since {new Date(profile.memberSince).toLocaleDateString()}
          {profile.verifiedBadgeTier > 0 && <span className="text-indigo-400"> · Verified</span>}
        </p>
      </div>

      {profile.gallery.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {profile.gallery.map((m) => (
            <div key={m.id} className="aspect-square rounded-md bg-slate-900 flex items-center justify-center text-xs text-slate-500">
              {m.mediaType === "photo" ? "📷" : "🎬"}
            </div>
          ))}
        </div>
      )}

      {profile.bio && <p className="text-sm text-slate-300 mb-4">{profile.bio}</p>}

      {profile.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.hashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4">
        <StatRow label="Age" value={profile.age} />
        <StatRow label="Role" value={profile.role?.replace("_", " ")} />
        <StatRow label="Body type" value={profile.bodyType} />
        <StatRow label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : null} />
        <StatRow label="Size" value={profile.size?.toUpperCase()} />
        <StatRow label="Status" value={profile.healthStatus} />
        <StatRow label="Smoker" value={profile.smoker == null ? null : profile.smoker ? "Yes" : "No"} />
        <StatRow label="Dirty" value={profile.dirtyPreference} />
        <StatRow label="Fisting" value={profile.fistingPreference} />
        <StatRow label="Contact" value={profile.contactInfo} />
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">Reviews</h2>
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No public reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {profile.reviews.map((r) => (
              <div key={r.id} className="rounded-md bg-slate-900 p-3 text-sm">
                {r.rating != null && <p className="text-indigo-400">{"★".repeat(r.rating)}</p>}
                {r.body && <p>{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {notice && <p className="text-sm text-emerald-400 mb-3">{notice}</p>}

      {!profile.isSelf && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={tap} disabled={tapped} className="flex-1 rounded-md bg-slate-800 disabled:opacity-50">
              {tapped ? "Tapped" : "Tap"}
            </button>
            <button onClick={message} className="flex-1 rounded-md bg-indigo-600">
              Message
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleFavorite} disabled={busy} className="flex-1 rounded-md bg-slate-800">
              {profile.isFavorited ? "Unfavorite" : "Favorite"}
            </button>
            <button onClick={weMet} disabled={busy} className="flex-1 rounded-md bg-slate-800">
              We Met
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReport((v) => !v)} className="flex-1 rounded-md bg-slate-800">
              Report
            </button>
            <button onClick={block} disabled={busy} className="flex-1 rounded-md bg-red-900 text-red-200">
              Block
            </button>
          </div>

          {showReport && (
            <div className="rounded-md bg-slate-900 p-3 space-y-2">
              <p className="text-sm text-slate-400">Why are you reporting this profile?</p>
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => report(r.value)}
                  disabled={busy}
                  className="block w-full rounded-md bg-slate-800 text-left px-3 text-sm"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
