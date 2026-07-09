import { useEffect, useState } from "react";
import { api, Comment } from "./api";
import { timeAgo } from "./presence";

// Flat comment thread on a Timeline post or a review. The same review thread renders
// both in the Timeline and on the reviewee's profile.
export function CommentThread({
  targetType,
  targetId,
  initialComments,
  onCountChange,
  onViewProfile
}: {
  targetType: "post" | "review";
  targetId: string;
  initialComments?: Comment[];
  onCountChange?: (count: number) => void;
  onViewProfile?: (userId: string) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(initialComments ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const myUserId = localStorage.getItem("userId");

  useEffect(() => {
    if (comments === null) {
      api
        .listComments(targetType, targetId)
        .then(setComments)
        .catch(() => setComments([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const comment = await api.createComment(targetType, targetId, body);
      const next = [...(comments ?? []), comment];
      setComments(next);
      onCountChange?.(next.length);
      setDraft("");
    } catch {
      // leave draft intact so the user can retry
    } finally {
      setSending(false);
    }
  }

  async function remove(commentId: string) {
    const next = (comments ?? []).filter((c) => c.id !== commentId);
    setComments(next);
    onCountChange?.(next.length);
    await api.deleteComment(commentId).catch(() => undefined);
  }

  return (
    <div className="space-y-2 border-t border-slate-800 pt-2">
      {(comments ?? []).map((c) => (
        <div key={c.id} className="text-sm">
          <button
            onClick={() => onViewProfile?.(c.authorId)}
            className="font-medium text-slate-200"
          >
            {c.authorDisplayName}
          </button>{" "}
          <span className="text-slate-300">{c.body}</span>
          <span className="ml-2 text-xs text-slate-500">
            {timeAgo(c.createdAt)}
            {c.authorId === myUserId && (
              <button onClick={() => remove(c.id)} className="ml-2 text-slate-500 underline">
                Delete
              </button>
            )}
          </span>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment…"
          className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm outline-none"
        />
        <button
          onClick={submit}
          disabled={sending || !draft.trim()}
          className="rounded-md bg-slate-800 px-3 text-sm text-indigo-400 disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
