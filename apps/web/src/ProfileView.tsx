import { ChangeEvent, useEffect, useState } from "react";
import { api, ApiError, getMediaUrl, ViewedProfile } from "./api";
import { FlameIcon } from "./FlameIcon";
import { Lightbox } from "./Lightbox";
import { CommentThread } from "./CommentThread";
import { isOnline, timeAgo } from "./presence";

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  return `${meters}m away`;
}

const DIRTY_LABELS: Record<string, string> = { dirty: "Dirty", not_dirty: "Not dirty", ws_only: "WS only" };
const FISTING_LABELS: Record<string, string> = {
  ff_active: "FF Active",
  ff_passive: "FF Passive",
  ff_vers: "FF Vers",
  no_ff: "No FF"
};

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

const GALLERY_SLOTS = 6;

export function ProfileView({
  userId,
  onBack,
  onMessage,
  onEdit
}: {
  userId: string;
  onBack?: () => void;
  onMessage?: (conversationId: string, displayName: string) => void;
  onEdit?: () => void;
}) {
  const [profile, setProfile] = useState<ViewedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Carries the media id alongside the url so the lightbox can offer delete on your own photos.
  const [lightbox, setLightbox] = useState<{ src: string; mediaId?: string | null } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [postingStatus, setPostingStatus] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  function load() {
    setError(null);
    setNotFound(false);
    // An empty id would hit `/profiles/` and 404, which would wrongly read as
    // "you have no profile" — bail out instead of asking for nothing.
    if (!userId) {
      setError("Couldn't identify your account — try signing out and back in.");
      return;
    }
    api
      .getViewedProfile(userId)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Something went wrong");
        }
      });
  }

  useEffect(load, [userId]);

  // Posting a status here IS posting to the Timeline — the profile status line simply
  // mirrors the latest post's text.
  async function submitStatus() {
    if (!statusDraft.trim() || postingStatus) return;
    setPostingStatus(true);
    try {
      // Editing rewrites the existing Timeline post rather than stacking a new one.
      if (editingStatus && profile?.statusPostId) {
        await api.updatePost(profile.statusPostId, statusDraft.trim());
      } else {
        await api.createPost(statusDraft.trim());
      }
      setStatusDraft("");
      setEditingStatus(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update status");
    } finally {
      setPostingStatus(false);
    }
  }

  // Deleting the status deletes the Timeline post behind it, which drops the profile
  // back to the empty composer.
  async function deleteStatus() {
    const postId = profile?.statusPostId;
    if (!postId || !profile) return;
    setProfile({ ...profile, statusText: null, statusPostId: null, statusUpdatedAt: null });
    try {
      await api.deletePost(postId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete status");
    }
    load();
  }

  async function toggleLikeProfilePhoto() {
    if (!profile || !profile.profilePhotoMediaId) return;
    const mediaId = profile.profilePhotoMediaId;
    const wasLiked = profile.iLikedMedia;
    setProfile({
      ...profile,
      iLikedMedia: !wasLiked,
      mediaLikeCount: profile.mediaLikeCount + (wasLiked ? -1 : 1)
    });
    await (wasLiked ? api.unlikeMedia(mediaId) : api.likeMedia(mediaId)).catch(() => undefined);
  }

  async function message() {
    const conversation = await api.startConversation(userId).catch(() => null);
    if (conversation && profile) onMessage?.(conversation.id, profile.displayName);
  }

  async function handleAddPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadMedia(file, "photo");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(mediaId: string) {
    try {
      await api.deleteMedia(mediaId);
      setLightbox(null);
      load();
    } catch (err) {
      setLightbox(null);
      setError(err instanceof ApiError ? err.message : "Couldn't delete photo");
    }
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

  // Two-way: un-marking removes only your own confirmation, and can revoke the review
  // eligibility that depended on it.
  async function toggleMet() {
    if (!profile || busy) return;
    const next = !profile.iConfirmedMet;
    setProfile({ ...profile, iConfirmedMet: next });
    setBusy(true);
    try {
      await (next ? api.confirmMeet(userId) : api.unconfirmMeet(userId));
      setNotice(
        next ? "Meet confirmed — once they confirm too, you can leave a review." : null
      );
      load();
    } catch (err) {
      setProfile((p) => (p ? { ...p, iConfirmedMet: !next } : p));
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

  if (notFound && onEdit) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-400">You haven't set up your profile yet.</p>
        <button onClick={onEdit} className="rounded-md bg-indigo-600 px-4 py-2.5 font-medium">
          Set up profile
        </button>
      </div>
    );
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 mb-4">
            ← Back
          </button>
        )}
        <p className="text-red-400 text-sm">{notFound ? "Profile not found" : error}</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      {onBack && (
        <button onClick={onBack} className="text-slate-400 mb-4">
          ← Back
        </button>
      )}

      <div className="relative mb-4">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 truncate text-xl font-semibold">{profile.displayName}</h1>
          {!profile.isSelf && (
            <>
              {/* Ellipsis sits 8px (gap-2) after the name. A native <select> so tapping
                  opens the real OS menu, same as the Grid filter chips; the transparent
                  select sits over the icon. */}
              <div className="relative h-6 w-6 shrink-0 text-slate-400">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <circle cx="5" cy="12" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="19" cy="12" r="1.75" />
                </svg>
                <select
                  aria-label="More"
                  value=""
                  onChange={(e) => {
                    const action = e.target.value;
                    e.target.value = "";
                    e.target.blur();
                    if (action === "report") setShowReport(true);
                    if (action === "block") block();
                  }}
                  className="absolute inset-0 h-full w-full appearance-none opacity-0"
                >
                  {/* `hidden` keeps this as the select's value without pre-selecting
                      Report or Block, and excludes it from the native picker list. */}
                  <option value="" hidden />
                  <option value="report">Report</option>
                  <option value="block">Block</option>
                </select>
              </div>
              <button
                onClick={toggleFavorite}
                disabled={busy}
                aria-label={profile.isFavorited ? "Remove favourite" : "Add favourite"}
                className={`ml-auto shrink-0 ${profile.isFavorited ? "text-amber-400" : "text-slate-500"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill={profile.isFavorited ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m12 3.5 2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 17l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9L12 3.5Z"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Always render a presence line. lastSeenAt is NULL for accounts that predate
            heartbeat tracking, so fall back to onlineStatus rather than showing nothing. */}
        {profile.lastSeenAt && isOnline(profile.lastSeenAt) ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Online
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            {profile.lastSeenAt
              ? `Last online ${timeAgo(profile.lastSeenAt)}`
              : profile.onlineStatus === "online"
                ? "Online"
                : "Offline"}
          </p>
        )}
        {!profile.isSelf && profile.distanceMeters != null && (
          <p className="text-xs text-emerald-400">{formatDistance(profile.distanceMeters)}</p>
        )}

      </div>

      {profile.profilePhotoStorageKey && (
        <div className="relative mb-4">
          <img
            src={getMediaUrl(profile.profilePhotoStorageKey)}
            alt=""
            onClick={() =>
              setLightbox({ src: getMediaUrl(profile.profilePhotoStorageKey!), mediaId: profile.profilePhotoMediaId })
            }
            className="w-full aspect-square rounded-lg bg-slate-900 object-cover"
          />
          {!profile.isSelf && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLikeProfilePhoto();
              }}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm"
            >
              <FlameIcon
                active={profile.iLikedMedia}
                className={`h-6 w-6 ${profile.iLikedMedia ? "" : "text-slate-200"}`}
              />
              <span className="text-sm font-medium text-slate-100">{profile.mediaLikeCount}</span>
            </button>
          )}
        </div>
      )}

      {!profile.isSelf && profile.statusText && (
        <div className="mb-4">
          <p className="break-words text-sm font-semibold text-slate-100">{profile.statusText}</p>
          {profile.statusUpdatedAt && (
            <p className="mt-0.5 text-xs text-slate-500">{timeAgo(profile.statusUpdatedAt)}</p>
          )}
        </div>
      )}

      {/* Your own status: once set it's just the status itself — text, when it went up,
          and edit/delete. The composer only comes back when there's no status to show. */}
      {profile.isSelf &&
        (profile.statusText && !editingStatus ? (
          <div className="mb-4 flex items-start gap-2 rounded-md bg-slate-900 p-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-100">{profile.statusText}</p>
              {profile.statusUpdatedAt && (
                <p className="mt-0.5 text-xs text-slate-500">{timeAgo(profile.statusUpdatedAt)}</p>
              )}
            </div>
            <button
              onClick={() => {
                setStatusDraft(profile.statusText ?? "");
                setEditingStatus(true);
              }}
              aria-label="Edit status"
              title="Edit status"
              className="shrink-0 text-slate-400"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10a2.83 2.83 0 1 0-4-4L4 16v4Z" />
              </svg>
            </button>
            <button
              onClick={deleteStatus}
              aria-label="Delete status"
              title="Delete status"
              className="shrink-0 text-slate-400"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-md bg-slate-900 p-3 space-y-2">
            <textarea
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              placeholder="Update your status"
              rows={2}
              className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              {editingStatus && (
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setStatusDraft("");
                  }}
                  className="flex-1 rounded-md bg-slate-800 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={submitStatus}
                disabled={postingStatus || !statusDraft.trim()}
                className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium disabled:opacity-50"
              >
                {postingStatus ? "Saving…" : editingStatus ? "Save" : "Post"}
              </button>
            </div>
          </div>
        ))}

      {(() => {
        const rest = profile.gallery.filter((m) => m.storageKey !== profile.profilePhotoStorageKey);
        if (!profile.isSelf && rest.length === 0) return null;
        const emptySlots = Math.max(0, GALLERY_SLOTS - rest.length);
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {rest.map((m) =>
              m.mediaType === "photo" ? (
                <img
                  key={m.id}
                  src={getMediaUrl(m.storageKey)}
                  alt=""
                  onClick={() => setLightbox({ src: getMediaUrl(m.storageKey), mediaId: m.id })}
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
            {profile.isSelf &&
              Array.from({ length: emptySlots }).map((_, i) =>
                i === 0 ? (
                  <label
                    key="add-photo"
                    className="aspect-square rounded-md border-2 border-dashed border-slate-700 flex items-center justify-center text-2xl text-slate-500 cursor-pointer"
                  >
                    {uploading ? "…" : "+"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddPhoto}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded-md border-2 border-dashed border-slate-800"
                  />
                )
              )}
          </div>
        );
      })()}

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
        <StatRow label="Dirty" value={profile.dirtyPreference ? DIRTY_LABELS[profile.dirtyPreference] : null} />
        <StatRow label="Fisting" value={profile.fistingPreference ? FISTING_LABELS[profile.fistingPreference] : null} />
        <StatRow label="Contact" value={profile.contactInfo} />
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">Reviews</h2>
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No public reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {profile.reviews.map((r) => (
              <div key={r.id} className="rounded-md bg-slate-900 p-3 text-sm space-y-1">
                {r.body && <p>{r.body}</p>}
                {r.rating != null && <p className="text-indigo-400">{"★".repeat(r.rating)}</p>}
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
                    aria-label="Report review"
                    className="text-slate-500"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4m0 0h11l-1.5 4L16 12H5" />
                    </svg>
                  </button>
                )}
                <CommentThread targetType="review" targetId={r.id} initialComments={r.comments} />
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
          <button
            onClick={toggleMet}
            disabled={busy}
            role="switch"
            aria-checked={profile.iConfirmedMet}
            className="flex w-full items-center justify-between rounded-md bg-slate-800 px-3 py-2.5 text-left text-sm disabled:opacity-50"
          >
            <span>We've met in person</span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                profile.iConfirmedMet ? "bg-indigo-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  profile.iConfirmedMet ? "left-[1.375rem]" : "left-0.5"
                }`}
              />
            </span>
          </button>

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

      <p className="mt-6 text-xs text-slate-500">
        Member since {new Date(profile.memberSince).toLocaleDateString()}
        {profile.verifiedBadgeTier > 0 && <span className="text-indigo-400"> · Verified</span>}
      </p>

      {profile.isSelf && onEdit && (
        <button
          onClick={onEdit}
          className="fixed bottom-20 right-4 z-30 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium shadow-lg"
        >
          Edit
        </button>
      )}

      {/* Message stays reachable however far down the profile you've scrolled. A viewed
          profile renders without the NavBar (see App.tsx), so this only has to clear
          the home indicator, not a tab bar. */}
      {!profile.isSelf && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <button onClick={message} className="w-full rounded-md bg-indigo-600 py-2.5 font-medium">
            Message
          </button>
        </div>
      )}

      {lightbox && (
        <Lightbox
          src={lightbox.src}
          onClose={() => setLightbox(null)}
          onDelete={
            profile.isSelf && lightbox.mediaId
              ? async () => {
                  await deletePhoto(lightbox.mediaId!);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
