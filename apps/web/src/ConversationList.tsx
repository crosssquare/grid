import { useEffect, useState } from "react";
import { api, ApiError, ConversationSummary } from "./api";

export function ConversationList({ onOpen }: { onOpen: (c: ConversationSummary) => void }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listConversations()
      .then(setConversations)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold mb-4">Chat</h1>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && conversations.length === 0 && (
        <p className="text-slate-500 text-sm">
          No conversations yet — tap "Message" on a profile in the Grid to start one.
        </p>
      )}

      <div className="space-y-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{c.otherDisplayName}</p>
                {c.otherOnlineStatus === "online" && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
                {c.status === "request" && (
                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    Request
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-slate-400">{c.lastMessageBody ?? "No messages yet"}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
