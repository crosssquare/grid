import { ChangeEvent, useEffect, useState } from "react";
import { api, ApiError, FeedMedia, FeedPost, MediaItem, getMediaUrl } from "./api";
import { FlameIcon } from "./FlameIcon";
import { Lightbox } from "./Lightbox";
import { CommentThread } from "./CommentThread";
import { UndoToast } from "./UndoToast";
import { OnlineDot } from "./presence";

function postId(feedId: string): string {
  return feedId.replace(/^post-/, "");
}

function reviewId(feedId: string): string {
  return feedId.replace(/^review-/, "");
}

export function Timeline({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ post: FeedPost; index: number } | null>(null);

  function load() {
    api
      .listFeed()
      .then(setPosts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingCount((n) => n + files.length);
    setError(null);
    for (const file of files) {
      try {
        // skipPost: the composer creates ONE post referencing all photos — without it,
        // every upload would auto-create its own caption-less Timeline entry too.
        const item = await api.uploadMedia(file, "photo", true);
        setAttachments((prev) => [...prev, item]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Upload failed");
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  }

  // The upload already exists server-side as a private draft, so dropping it from the
  // composer has to delete it too — otherwise it lingers as an unreferenced row.
  function removeAttachment(mediaId: string) {
    setAttachments((prev) => prev.filter((x) => x.id !== mediaId));
    void api.deleteMedia(mediaId).catch(() => undefined);
  }

  async function submitPost() {
    if (!draft.trim() && attachments.length === 0) return;
    setPosting(true);
    setError(null);
    try {
      await api.createPost(draft.trim(), attachments.length > 0 ? attachments.map((a) => a.id) : undefined);
      setDraft("");
      setAttachments([]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post");
    } finally {
      setPosting(false);
    }
  }

  function remove(feedId: string) {
    const index = posts.findIndex((p) => p.id === feedId);
    if (index === -1) return;
    const post = posts[index];
    // A pending delete that hasn't expired yet gets committed now — only one undo at a time.
    if (pendingDelete) {
      void api.deletePost(postId(pendingDelete.post.id)).catch(() => undefined);
    }
    setPosts((prev) => prev.filter((p) => p.id !== feedId));
    setPendingDelete({ post, index });
  }

  function commitPendingDelete() {
    if (!pendingDelete) return;
    void api.deletePost(postId(pendingDelete.post.id)).catch(() => undefined);
    setPendingDelete(null);
  }

  function undoPendingDelete() {
    if (!pendingDelete) return;
    const { post, index } = pendingDelete;
    setPosts((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, post);
      return next;
    });
    setPendingDelete(null);
  }

  function startEditing(post: FeedPost) {
    setEditingId(post.id);
    setCaptionDraft(post.body ?? "");
  }

  async function saveCaption(feedId: string) {
    setSavingCaption(true);
    try {
      await api.updatePost(postId(feedId), captionDraft.trim());
      setPosts((prev) => prev.map((p) => (p.id === feedId ? { ...p, body: captionDraft.trim() || null } : p)));
      setEditingId(null);
    } catch {
      // no-op — user can retry, edit box stays open
    } finally {
      setSavingCaption(false);
    }
  }

  // Per-photo flame — updates the photo everywhere it appears (post media arrays and
  // "liked" activity entries share the same media id).
  async function toggleMediaLike(mediaId: string) {
    let wasLiked = false;
    for (const p of posts) {
      const inMedia = p.media.find((m) => m.id === mediaId);
      if (inMedia) wasLiked = inMedia.iLiked;
      else if (p.kind === "like" && p.mediaId === mediaId) wasLiked = p.iLiked;
    }
    setPosts((prev) =>
      prev.map((p) => {
        const next = { ...p };
        if (p.kind === "like" && p.mediaId === mediaId) {
          next.iLiked = !wasLiked;
          next.likeCount = p.likeCount + (wasLiked ? -1 : 1);
        }
        next.media = p.media.map((m) =>
          m.id === mediaId ? { ...m, iLiked: !wasLiked, likeCount: m.likeCount + (wasLiked ? -1 : 1) } : m
        );
        return next;
      })
    );
    await (wasLiked ? api.unlikeMedia(mediaId) : api.likeMedia(mediaId)).catch(() => undefined);
  }

  async function toggleReviewLike(feedId: string) {
    const entry = posts.find((p) => p.id === feedId);
    if (!entry) return;
    const wasLiked = entry.iLiked;
    setPosts((prev) =>
      prev.map((p) => (p.id === feedId ? { ...p, iLiked: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) } : p))
    );
    const id = reviewId(feedId);
    await (wasLiked ? api.unlikeReview(id) : api.likeReview(id)).catch(() => undefined);
  }

  function findLightboxMedia(): { media: FeedMedia } | null {
    if (!lightboxMediaId) return null;
    for (const p of posts) {
      const m = p.media.find((x) => x.id === lightboxMediaId);
      if (m) return { media: m };
      if (p.kind === "like" && p.mediaId === lightboxMediaId && p.mediaStorageKey) {
        return {
          media: {
            id: p.mediaId,
            storageKey: p.mediaStorageKey,
            mediaType: p.mediaType ?? "photo",
            likeCount: p.likeCount,
            iLiked: p.iLiked
          }
        };
      }
    }
    return null;
  }

  const lightbox = findLightboxMedia();

  function mediaFlame(m: FeedMedia, overlay: boolean) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMediaLike(m.id);
        }}
        className={
          overlay
            ? "absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 backdrop-blur-sm"
            : "flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1.5"
        }
      >
        <FlameIcon active={m.iLiked} className={`h-5 w-5 ${m.iLiked ? "" : "text-slate-200"}`} />
        <span className="text-xs font-medium text-slate-100">{m.likeCount}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold mb-4">Timeline</h1>

      <div className="rounded-md bg-slate-900 p-3 space-y-2 mb-4">
        {/* The photo picker sits inside the field, bottom-right, so it reads as part of
            the status you're writing rather than a separate control next to Post. */}
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Update your status"
            rows={2}
            className="block w-full rounded-md bg-slate-800 p-2 pr-11 text-sm outline-none"
          />
          <label
            aria-label="Add photo"
            title="Add photo"
            className="absolute bottom-2 right-2 cursor-pointer text-slate-400"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 17 4.5-4.5 3 3L15 12l5 5" />
            </svg>
            <input type="file" accept="image/*" multiple onChange={handleAttach} className="hidden" />
          </label>
        </div>
        {(attachments.length > 0 || uploadingCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="relative">
                <img src={getMediaUrl(a.storageKey)} alt="" className="h-16 w-16 rounded-md bg-slate-800 object-cover" />
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 min-h-0 items-center justify-center rounded-full bg-slate-700 text-xs leading-none"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            {uploadingCount > 0 && (
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-500">
                …
              </div>
            )}
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={submitPost}
          disabled={posting || uploadingCount > 0 || (!draft.trim() && attachments.length === 0)}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium disabled:opacity-50"
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {!loading && posts.length === 0 && <p className="text-slate-500 text-sm">No posts yet — be the first.</p>}

      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} className="rounded-md bg-slate-900 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={() => onViewProfile(p.userId)} className="flex items-center gap-2">
                {p.profilePhotoStorageKey ? (
                  <img
                    src={getMediaUrl(p.profilePhotoStorageKey)}
                    alt=""
                    className="h-8 w-8 rounded-full bg-slate-800 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-800" />
                )}
                <span className="font-medium">{p.displayName}</span>
                <OnlineDot lastSeenAt={p.lastSeenAt} />
              </button>
              {p.kind === "like" && p.targetUserId && (
                <span className="text-slate-400">
                  liked{" "}
                  <button onClick={() => onViewProfile(p.targetUserId!)} className="font-medium text-slate-200">
                    {p.targetDisplayName}
                  </button>
                  's photo
                </span>
              )}
              {p.kind === "review" && p.targetUserId && (
                <span className="text-slate-400">
                  reviewed{" "}
                  <button onClick={() => onViewProfile(p.targetUserId!)} className="font-medium text-slate-200">
                    {p.targetDisplayName}
                  </button>
                </span>
              )}
            </div>

            {p.kind === "like" && p.mediaStorageKey && (
              <div className="flex items-center gap-3">
                {p.mediaType === "photo" ? (
                  <img
                    src={getMediaUrl(p.mediaStorageKey)}
                    alt=""
                    onClick={() => setLightboxMediaId(p.mediaId)}
                    className="h-16 w-16 rounded-md bg-slate-800 object-cover cursor-pointer shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    🎬
                  </div>
                )}
                {mediaFlame(
                  {
                    id: p.mediaId!,
                    storageKey: p.mediaStorageKey,
                    mediaType: p.mediaType ?? "photo",
                    likeCount: p.likeCount,
                    iLiked: p.iLiked
                  },
                  false
                )}
              </div>
            )}

            {p.kind === "post" && p.media.length === 1 && (
              <div className="relative">
                {p.media[0].mediaType === "photo" ? (
                  <img
                    src={getMediaUrl(p.media[0].storageKey)}
                    alt=""
                    onClick={() => setLightboxMediaId(p.media[0].id)}
                    className="aspect-square w-full rounded-md bg-slate-800 object-cover cursor-pointer"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-md bg-slate-800 flex items-center justify-center text-2xl">
                    🎬
                  </div>
                )}
                {p.media[0].mediaType === "photo" && mediaFlame(p.media[0], true)}
              </div>
            )}

            {p.kind === "post" && p.media.length > 1 && (
              <div className="grid grid-cols-2 gap-1.5">
                {p.media.map((m) => (
                  <div key={m.id} className="relative">
                    {m.mediaType === "photo" ? (
                      <img
                        src={getMediaUrl(m.storageKey)}
                        alt=""
                        onClick={() => setLightboxMediaId(m.id)}
                        className="aspect-square w-full rounded-md bg-slate-800 object-cover cursor-pointer"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded-md bg-slate-800 flex items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}
                    {m.mediaType === "photo" && mediaFlame(m, true)}
                  </div>
                ))}
              </div>
            )}

            {p.kind === "post" &&
              (editingId === p.id ? (
                <div className="space-y-1">
                  <textarea
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Add a caption…"
                    rows={2}
                    className="w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCaption(p.id)}
                      disabled={savingCaption}
                      className="flex-1 rounded-md bg-indigo-600 py-1.5 text-xs disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-md bg-slate-800 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                p.body && <p>{p.body}</p>
              ))}

            {/* Stars sit under the written review, matching the profile. */}
            {p.kind === "review" && p.body && <p>{p.body}</p>}
            {p.kind === "review" && p.rating != null && (
              <p className="text-indigo-400">{"★".repeat(p.rating)}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                {p.kind === "review" && (
                  <button onClick={() => toggleReviewLike(p.id)} className="flex items-center gap-1">
                    <FlameIcon active={p.iLiked} className={`h-4 w-4 ${p.iLiked ? "" : "text-slate-400"}`} />
                    <span className="text-xs text-slate-400">{p.likeCount}</span>
                  </button>
                )}
                {(p.kind === "post" || p.kind === "review") && (
                  <button
                    onClick={() => setOpenCommentsId((cur) => (cur === p.id ? null : p.id))}
                    className="text-xs text-slate-400"
                  >
                    💬 {p.commentCount > 0 ? p.commentCount : ""}
                  </button>
                )}
              </div>
              {p.kind === "post" && p.isMine && editingId !== p.id && (
                <div className="flex items-center gap-3 text-slate-500">
                  <button
                    onClick={() => startEditing(p)}
                    aria-label={p.media.length > 0 ? (p.body ? "Edit caption" : "Add caption") : "Edit post"}
                    title={p.media.length > 0 ? (p.body ? "Edit caption" : "Add caption") : "Edit"}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                    </svg>
                  </button>
                  <button onClick={() => remove(p.id)} aria-label="Delete post" title="Delete">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {openCommentsId === p.id && (p.kind === "post" || p.kind === "review") && (
              <CommentThread
                targetType={p.kind}
                targetId={p.kind === "post" ? postId(p.id) : reviewId(p.id)}
                onCountChange={(count) =>
                  setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, commentCount: count } : x)))
                }
                onViewProfile={onViewProfile}
              />
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <Lightbox
          src={getMediaUrl(lightbox.media.storageKey)}
          onClose={() => setLightboxMediaId(null)}
          like={{
            count: lightbox.media.likeCount,
            liked: lightbox.media.iLiked,
            onToggle: () => toggleMediaLike(lightbox.media.id)
          }}
        />
      )}

      {pendingDelete && (
        <UndoToast message="Post deleted" onUndo={undoPendingDelete} onExpire={commitPendingDelete} />
      )}
    </div>
  );
}
