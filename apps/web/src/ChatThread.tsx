import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError, Message, getMediaUrl } from "./api";
import { getSocket } from "./socket";

const CHARM_EMOJI = ["🔥", "🐷"];

function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({
  conversationId,
  otherDisplayName,
  onBack
}: {
  conversationId: string;
  otherDisplayName: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [charmBarMessageId, setCharmBarMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const myUserId = localStorage.getItem("userId");

  useEffect(() => {
    api
      .getMessages(conversationId)
      .then(setMessages)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"));

    const socket = getSocket();
    if (!socket) return;

    function onNewMessage(payload: { conversationId: string; message: Message }) {
      if (payload.conversationId === conversationId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    }
    socket.on("message:new", onNewMessage);
    return () => {
      socket.off("message:new", onNewMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setError(null);
    try {
      const message = await api.sendMessage(conversationId, draft.trim());
      setMessages((prev) => [...prev, message]);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function react(message: Message, emoji: string) {
    setCharmBarMessageId(null);
    const mine = (message.reactions ?? []).find((r) => r.userId === myUserId);
    const removing = mine?.emoji === emoji;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== message.id) return m;
        const others = (m.reactions ?? []).filter((r) => r.userId !== myUserId);
        return { ...m, reactions: removing ? others : [...others, { userId: myUserId ?? "", emoji }] };
      })
    );
    await (removing
      ? api.removeMessageReaction(conversationId, message.id)
      : api.reactToMessage(conversationId, message.id, emoji)
    ).catch(() => undefined);
  }

  // Fallback avatar for messages appended after send/socket-push, which don't carry
  // the sender's photo key — reuse it from any fetched message by the same sender.
  function avatarKey(m: Message): string | null {
    if (m.senderProfilePhotoStorageKey) return m.senderProfilePhotoStorageKey;
    return messages.find((x) => x.senderId === m.senderId && x.senderProfilePhotoStorageKey)
      ?.senderProfilePhotoStorageKey ?? null;
  }

  return (
    <div className="flex h-[calc(100vh-3.25rem-env(safe-area-inset-top))] flex-col bg-slate-950 text-slate-100 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <button onClick={onBack} className="text-slate-400">
          ← Back
        </button>
        <h1 className="font-medium truncate">{otherDisplayName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => {
          const isMine = m.senderId === myUserId;
          const key = avatarKey(m);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine &&
                (key ? (
                  <img src={getMediaUrl(key)} alt="" className="h-7 w-7 shrink-0 rounded-full bg-slate-800 object-cover" />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-slate-800" />
                ))}
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                <button
                  onClick={() => setCharmBarMessageId((cur) => (cur === m.id ? null : m.id))}
                  className={`min-h-0 rounded-lg px-3 py-2 text-left text-sm ${isMine ? "bg-indigo-600" : "bg-slate-900"}`}
                >
                  {m.body}
                </button>
                {(m.reactions ?? []).length > 0 && (
                  <div className={`-mt-1.5 flex gap-1 ${isMine ? "mr-1 self-end" : "ml-1 self-start"}`}>
                    {CHARM_EMOJI.filter((e) => (m.reactions ?? []).some((r) => r.emoji === e)).map((e) => {
                      const count = (m.reactions ?? []).filter((r) => r.emoji === e).length;
                      return (
                        <span key={e} className="rounded-full bg-slate-800 px-1.5 py-0.5 text-xs">
                          {e}
                          {count > 1 ? ` ${count}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
                {charmBarMessageId === m.id && (
                  <div className={`mt-1 flex gap-1 rounded-full bg-slate-800 px-2 py-1 ${isMine ? "self-end" : "self-start"}`}>
                    {CHARM_EMOJI.map((e) => (
                      <button key={e} onClick={() => react(m, e)} className="min-h-0 px-1.5 text-lg leading-none">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <span className={`mt-0.5 text-[10px] text-slate-500 ${isMine ? "self-end" : "self-start"}`}>
                  {messageTime(m.createdAt)}
                </span>
              </div>
              {isMine &&
                (key ? (
                  <img src={getMediaUrl(key)} alt="" className="h-7 w-7 shrink-0 rounded-full bg-slate-800 object-cover" />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-slate-800" />
                ))}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-md bg-slate-900 px-3 outline-none focus:ring-2 focus:ring-slate-500"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-4 font-medium">
          Send
        </button>
      </form>
    </div>
  );
}
