import { useEffect, useState } from "react";
import { api, ApiError, getMediaUrl, ViewedProfile } from "./api";
import { FlameIcon } from "./FlameIcon";
import { Timeline } from "./Timeline";
import { Lightbox } from "./Lightbox";

const REPORT_REASONS = [
  { value: "fake_profile", label: "Fake profile" },
  { value: "underage_concern", label: "Underage concern" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "illegal_content", label: "Illegal content" },
  { value: "csam", label: "CSAM" }
];

const REVIEW_REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "defamation", label: "Defamation" },
  { value: "false_content", label: "False content" },
  { value: "personal_info", label: "Contains personal info" },
  { value: "other", label: "Other" }
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
  const [metConfirmed, setMetConfirmed] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  function load() {
    api
      .getViewedProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"));
  }

  useEffect(load, [userId]);

  async function tap() {
    if (!profile || profile.iTapped) return;
    setProfile({ ...profile, iTapped: true, tapCount: profile.tapCount + 1 });
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
      setMetConfirmed(true);
      setNotice("Meet confirmed — once they confirm too, you can leave a review.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    if (!profile) return;
    setSubmittingReview(true);
    setError(null);
    try {
      await api.submitReview(userId, reviewRating || undefined, reviewBody);
      setProfile({ ...profile, canReview: false, myReviewStatus: "pending" });
      setNotice("Review submitted — it'll show once they approve it.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function reportReview(reviewId: string, reasonCode: string) {
    setBusy(true);
    try {
      await api.reportReview(reviewId, reasonCode);
      setReportingReviewId(null);
      setNotice("Review reported.");
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

      {profile.profilePhotoStorageKey && (
        <div className="relative mb-4">
          <img
            src={getMediaUrl(profile.profilePhotoStorageKey)}
            alt=""
            onClick={() => setLightboxSrc(getMediaUrl(profile.profilePhotoStorageKey!))}
            className="w-full aspect-square rounded-lg bg-slate-900 object-cover"
          />
          {!profile.isSelf && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                tap();
              }}
              disabled={profile.iTapped}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm"
            >
              <FlameIcon
                active={profile.iTapped}
                className={`h-6 w-6 ${profile.iTapped ? "" : "text-slate-200"}`}
              />
              <span className="text-sm font-medium text-slate-100">{profile.tapCount}</span>
            </button>
          )}
        </div>
      )}

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
          {profile.gallery
            .filter((m) => m.storageKey !== profile.profilePhotoStorageKey)
            .map((m) =>
              m.mediaType === "photo" ? (
                <img
                  key={m.id}
                  src={getMediaUrl(m.storageKey)}
                  alt=""
                  onClick={() => setLightboxSrc(getMediaUrl(m.storageKey))}
                  className="aspect-square rounded-md bg-slate-900 object-cover cursor-pointer"
                />
              ) : (
                <div
                  key={m.id}
                  className="aspect-square rounded-md bg-slate-900 flex items-center justify-center text-xs text-slate-500"
                >
                  🎬
                </div>
              )
            )}
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

      <Timeline userId={userId} isSelf={profile.isSelf} />

      <div className="mb-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">Reviews</h2>
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No public reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {profile.reviews.map((r) => (
              <div key={r.id} className="rounded-md bg-slate-900 p-3 text-sm space-y-1">
                {r.rating != null && <p className="text-indigo-400">{"★".repeat(r.rating)}</p>}
                {r.body && <p>{r.body}</p>}
                {reportingReviewId === r.id ? (
                  <div className="pt-1 space-y-1">
                    {REVIEW_REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => reportReview(r.id, reason.value)}
                        disabled={busy}
                        className="block w-full rounded-md bg-slate-800 text-left px-2 py-1 text-xs text-slate-300"
                      >
                        {reason.label}
                      </button>
                    ))}
                    <button onClick={() => setReportingReviewId(null)} className="text-xs text-slate-500 underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setReportingReviewId(r.id)}
                    className="text-xs text-slate-500 underline"
                  >
                    Report
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!profile.isSelf && profile.canReview && (
          <div className="mt-3 rounded-md bg-slate-900 p-3 space-y-2">
            <p className="text-sm text-slate-300">Leave a review of {profile.displayName}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={`text-2xl leading-none ${star <= reviewRating ? "text-indigo-400" : "text-slate-700"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="How did it go?"
              rows={3}
              className="w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
            />
            <button
              onClick={submitReview}
              disabled={submittingReview}
              className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submittingReview ? "Submitting…" : "Submit review"}
            </button>
          </div>
        )}
        {!profile.isSelf && profile.myReviewStatus === "pending" && (
          <p className="mt-2 text-xs text-slate-500">Your review is awaiting their approval.</p>
        )}
      </div>

      {notice && <p className="text-sm text-emerald-400 mb-3">{notice}</p>}

      {!profile.isSelf && (
        <div className="space-y-2">
          <button onClick={message} className="w-full rounded-md bg-indigo-600 py-2.5 font-medium">
            Message
          </button>
          <div className="flex gap-2">
            <button onClick={toggleFavorite} disabled={busy} className="flex-1 rounded-md bg-slate-800">
              {profile.isFavorited ? "Unfavorite" : "Favorite"}
            </button>
            <button
              onClick={weMet}
              disabled={busy || metConfirmed}
              className="flex-1 rounded-md bg-slate-800 disabled:opacity-50"
            >
              {metConfirmed ? "Meet confirmed" : "We Met"}
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

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
