import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError, Message } from "./api";
import { getSocket } from "./socket";

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const myUserId = localStorage.getItem("userId");

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <button onClick={onBack} className="text-slate-400">
          ← Back
        </button>
        <h1 className="font-medium truncate">{otherDisplayName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === myUserId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.senderId === myUserId ? "bg-indigo-600" : "bg-slate-900"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-800 p-3 pb-6">
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
