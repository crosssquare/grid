import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { ChatView } from "./ChatView";
import { NavBar, View } from "./NavBar";
import { disconnectSocket } from "./socket";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));
  const [view, setView] = useState<View>("grid");
  const [openConversation, setOpenConversation] = useState<{ id: string; displayName: string } | null>(null);

  useEffect(() => {
    const onSessionExpired = () => setAuthed(false);
    window.addEventListener("grid:session-expired", onSessionExpired);
    return () => window.removeEventListener("grid:session-expired", onSessionExpired);
  }, []);

  const openChat = useCallback((id: string, displayName: string) => {
    setOpenConversation({ id, displayName });
    setView("chat");
  }, []);

  function logout() {
    disconnectSocket();
    setAuthed(false);
  }

  if (!authed) {
    return <AuthForm onAuthenticated={() => setAuthed(true)} />;
  }

  return (
    <>
      {view === "grid" && <DiscoveryGrid onMessage={openChat} />}
      {view === "chat" && (
        <ChatView openConversationId={openConversation} onConsumeOpenConversation={() => setOpenConversation(null)} />
      )}
      {view === "profile" && <ProfileForm onLogout={logout} />}
      <NavBar view={view} onChange={setView} />
    </>
  );
}
