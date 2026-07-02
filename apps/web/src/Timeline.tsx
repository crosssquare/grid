import { useEffect, useState } from "react";
import { api, ApiError, FeedPost, getMediaUrl } from "./api";

export function Timeline({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function remove(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await api.deletePost(postId).catch(() => undefined);
  }

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
            {p.body && <p>{p.body}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
              {p.isMine && (
                <button onClick={() => remove(p.id)} className="text-xs text-slate-500 underline">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
