import { useEffect, useState } from "react";
import { api, PendingReview } from "./api";

export function PendingReviews() {
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  function load() {
    api
      .listPendingReviews()
      .then(setPending)
      .catch(() => undefined);
  }

  useEffect(load, []);

  async function decide(reviewId: string, decision: "approved" | "rejected", visibility?: "public" | "private") {
    setDecidingId(reviewId);
    try {
      await api.decideReview(reviewId, decision, visibility);
      setPending((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      // no-op — user can retry from the still-visible card
    } finally {
      setDecidingId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <div className="rounded-md bg-slate-900 p-3 space-y-3">
      <span className="text-sm font-medium text-slate-300">Reviews awaiting your approval</span>
      {pending.map((r) => {
        const busy = decidingId === r.id;
        return (
          <div key={r.id} className="rounded-md bg-slate-800 p-3 space-y-2 text-sm">
            <p className="text-slate-400">
              From <span className="text-slate-200">{r.reviewerDisplayName}</span>
            </p>
            {r.rating != null && <p className="text-indigo-400">{"★".repeat(r.rating)}</p>}
            {r.body && <p>{r.body}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => decide(r.id, "approved", "public")}
                disabled={busy}
                className="flex-1 rounded-md bg-indigo-600 py-1.5 text-xs disabled:opacity-50"
              >
                Approve — public
              </button>
              <button
                onClick={() => decide(r.id, "approved", "private")}
                disabled={busy}
                className="flex-1 rounded-md bg-slate-700 py-1.5 text-xs disabled:opacity-50"
              >
                Approve — private
              </button>
            </div>
            <button
              onClick={() => decide(r.id, "rejected")}
              disabled={busy}
              className="w-full rounded-md bg-red-900 text-red-200 py-1.5 text-xs disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        );
      })}
    </div>
  );
}
