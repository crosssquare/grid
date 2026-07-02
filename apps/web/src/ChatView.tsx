import { useEffect, useState } from "react";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { ConversationSummary } from "./api";

export function ChatView({
  openConversationId,
  onConsumeOpenConversation
}: {
  openConversationId: { id: string; displayName: string } | null;
  onConsumeOpenConversation: () => void;
}) {
  const [active, setActive] = useState<{ id: string; displayName: string } | null>(null);

  useEffect(() => {
    if (openConversationId) {
      setActive(openConversationId);
      onConsumeOpenConversation();
    }
  }, [openConversationId, onConsumeOpenConversation]);

  if (active) {
    return <ChatThread conversationId={active.id} otherDisplayName={active.displayName} onBack={() => setActive(null)} />;
  }

  return (
    <ConversationList
      onOpen={(c: ConversationSummary) => setActive({ id: c.id, displayName: c.otherDisplayName })}
      onOpenTap={(id, displayName) => setActive({ id, displayName })}
    />
  );
}
