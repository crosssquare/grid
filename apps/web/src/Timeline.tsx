import { useEffect, useState } from "react";
import { api, ApiError, FeedPost, getMediaUrl } from "./api";
import { FlameIcon } from "./FlameIcon";
import { Lightbox } from "./Lightbox";

function postId(feedId: string): string {
  return feedId.replace(/^post-/, "");
}

export function Timeline({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  function load() {
    api
      .listFeed()
      .then(setPosts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submitPost() {
    if (!draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.createPost(draft.trim());
      setDraft("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post");
    } finally {
      setPosting(false);
    }
  }

  async function remove(feedId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== feedId));
    await api.deletePost(postId(feedId)).catch(() => undefined);
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

  async function toggleLike(mediaId: string) {
    const current = posts.find((p) => p.mediaId === mediaId);
    const wasLiked = current?.iLiked ?? false;
    setPosts((prev) =>
      prev.map((p) =>
        p.mediaId === mediaId ? { ...p, iLiked: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) } : p
      )
    );
    await (wasLiked ? api.unlikeMedia(mediaId) : api.likeMedia(mediaId)).catch(() => undefined);
  }

  const lightboxPost = posts.find((p) => p.mediaId === lightboxMediaId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold mb-4">Timeline</h1>

      <div className="rounded-md bg-slate-900 p-3 space-y-2 mb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Share something…"
          rows={2}
          className="w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={submitPost}
          disabled={posting || !draft.trim()}
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

            {p.kind === "review" && p.rating != null && <p className="text-indigo-400">{"★".repeat(p.rating)}</p>}

            {p.mediaStorageKey &&
              (p.mediaType === "photo" ? (
                <div className="relative">
                  <img
                    src={getMediaUrl(p.mediaStorageKey)}
                    alt=""
                    onClick={() => setLightboxMediaId(p.mediaId)}
                    className="aspect-square w-full rounded-md bg-slate-800 object-cover cursor-pointer"
                  />
                  <button
                    onClick={() => toggleLike(p.mediaId!)}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 backdrop-blur-sm"
                  >
                    <FlameIcon active={p.iLiked} className={`h-5 w-5 ${p.iLiked ? "" : "text-slate-200"}`} />
                    <span className="text-xs font-medium text-slate-100">{p.likeCount}</span>
                  </button>
                </div>
              ) : (
                <div className="aspect-square w-full rounded-md bg-slate-800 flex items-center justify-center text-2xl">
                  🎬
                </div>
              ))}

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

            {p.kind === "review" && p.body && <p>{p.body}</p>}

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
              {p.kind === "post" && p.isMine && editingId !== p.id && (
                <div className="flex gap-3">
                  <button onClick={() => startEditing(p)} className="text-xs text-slate-500 underline">
                    {p.mediaId ? (p.body ? "Edit caption" : "Add caption") : "Edit"}
                  </button>
                  <button onClick={() => remove(p.id)} className="text-xs text-slate-500 underline">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightboxPost && lightboxPost.mediaStorageKey && (
        <Lightbox
          src={getMediaUrl(lightboxPost.mediaStorageKey)}
          onClose={() => setLightboxMediaId(null)}
          like={{
            count: lightboxPost.likeCount,
            liked: lightboxPost.iLiked,
            onToggle: () => toggleLike(lightboxPost.mediaId!)
          }}
        />
      )}
    </div>
  );
}
