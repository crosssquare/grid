import { useEffect, useState } from "react";
import { api, ApiError, ConversationSummary, Tap } from "./api";

export function ConversationList({
  onOpen,
  onOpenTap
}: {
  onOpen: (c: ConversationSummary) => void;
  onOpenTap: (conversationId: string, displayName: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingTapId, setOpeningTapId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listConversations()
      .then(setConversations)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
    api
      .tapsReceived()
      .then(setTaps)
      .catch(() => undefined);
  }, []);

  async function openTap(tap: Tap) {
    if (!tap.senderId) return;
    setOpeningTapId(tap.id);
    try {
      const conversation = await api.startConversation(tap.senderId);
      onOpenTap(conversation.id, tap.displayName);
    } catch {
      // no-op — user can retry
    } finally {
      setOpeningTapId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <h1 className="text-xl font-semibold mb-4">Chat</h1>

      {taps.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-400 mb-2">Tapped you</p>
          <div className="flex gap-2 overflow-x-auto">
            {taps.map((t) => (
              <button
                key={t.id}
                onClick={() => openTap(t)}
                disabled={openingTapId === t.id}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm disabled:opacity-50"
              >
                {t.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

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
