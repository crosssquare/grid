import { useEffect, useState } from "react";
import { api, ApiError, Post } from "./api";

export function Timeline({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    (isSelf ? api.listMyPosts() : api.listUserPosts(userId))
      .then(setPosts)
      .catch(() => undefined);
  }

  useEffect(load, [userId, isSelf]);

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
    <div className="mb-4 space-y-2">
      <h2 className="text-sm font-medium text-slate-400">Timeline</h2>

      {isSelf && (
        <div className="rounded-md bg-slate-900 p-3 space-y-2">
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
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-slate-500">No posts yet.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="rounded-md bg-slate-900 p-3 text-sm space-y-1">
              {p.body && <p>{p.body}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                {isSelf && (
                  <button onClick={() => remove(p.id)} className="text-xs text-slate-500 underline">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
